import { z } from "zod";
import { prisma } from "@/server/db";
import { router, protectedProcedure } from "@/libs/trpc";
import { generateApiKey } from "@/server/auth";
import { TRPCError } from "@trpc/server";
import { hash } from "bcryptjs";

export const apiKeysRouter = router({
  // 获取当前用户的所有API Keys
  list: protectedProcedure.query(async ({ ctx }) => {
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        userId: ctx.user.id,
        revokedAt: null, // 只显示未撤销的
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return apiKeys;
  }),

  // 创建新的API Key
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        expiresInDays: z.number().min(1).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { key, hash: keyHash, prefix } = generateApiKey();
      
      // 实际存储时应该hash
      const hashedKey = await hash(keyHash, 10);

      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      const apiKey = await prisma.apiKey.create({
        data: {
          userId: ctx.user.id,
          name: input.name,
          keyHash: hashedKey,
          prefix,
          expiresAt,
        },
        select: {
          id: true,
          name: true,
          prefix: true,
          expiresAt: true,
          createdAt: true,
        },
      });

      // 记录审计日志
      await prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "CREATE",
          resource: "ApiKey",
          resourceId: apiKey.id,
          details: { name: input.name },
        },
      });

      // 返回完整key（仅此一次）
      return {
        ...apiKey,
        key, // 完整key只在创建时返回一次
      };
    }),

  // 撤销API Key
  revoke: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const apiKey = await prisma.apiKey.findUnique({
        where: { id: input.id },
      });

      if (!apiKey || apiKey.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API Key不存在或无权限",
        });
      }

      if (apiKey.revokedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "API Key已被撤销",
        });
      }

      await prisma.apiKey.update({
        where: { id: input.id },
        data: { revokedAt: new Date() },
      });

      await prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "REVOKE",
          resource: "ApiKey",
          resourceId: input.id,
        },
      });

      return { success: true };
    }),
});

