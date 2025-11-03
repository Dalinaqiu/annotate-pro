import { z } from "zod";
import { prisma } from "@/server/db";
import { router, protectedProcedure } from "@/libs/trpc";
import { TRPCError } from "@trpc/server";

export const sessionsRouter = router({
  // 获取当前用户的所有session
  list: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await prisma.session.findMany({
      where: { userId: ctx.user.id },
      select: {
        id: true,
        sessionToken: true,
        expires: true,
        createdAt: true,
        updatedAt: true,
        userAgent: true,
        ipAddress: true,
        deviceName: true,
        isActive: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return sessions;
  }),

  // 终止指定的session
  revoke: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const session = await prisma.session.findUnique({
        where: { id: input.sessionId },
      });

      if (!session || session.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session不存在或无权限",
        });
      }

      await prisma.session.delete({
        where: { id: input.sessionId },
      });

      await prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "LOGOUT",
          resource: "Session",
          resourceId: input.sessionId,
          details: { revoked: true },
        },
      });

      return { success: true };
    }),

  // 终止所有其他session
  revokeAll: protectedProcedure.mutation(async ({ ctx }) => {
    // 获取当前session token（需要从NextAuth获取）
    // 这里简化处理，删除所有其他session
    
    await prisma.session.deleteMany({
      where: {
        userId: ctx.user.id,
        // TODO: 排除当前session
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: ctx.user.id,
        action: "LOGOUT",
        resource: "Session",
        details: { revokedAll: true },
      },
    });

    return { success: true };
  }),
});

