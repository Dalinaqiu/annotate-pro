import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { hashPassword, generateApiKey } from "@/server/auth";
import { prisma } from "@/server/db";
import { router, publicProcedure, protectedProcedure } from "@/libs/trpc";

export const authRouter = router({
  // 注册
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "该邮箱已被注册",
        });
      }

      const passwordHash = await hashPassword(input.password);
      
      const user = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          name: input.name,
          status: "PENDING_VERIFICATION",
        },
      });

      // TODO: 发送邮箱验证链接

      return { success: true, userId: user.id };
    }),

  // 重置密码请求
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (!user) {
        // 安全考虑：不暴露用户是否存在
        return { success: true };
      }

      // TODO: 生成重置token并发送邮件

      return { success: true };
    }),

  // 重置密码
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: 验证token并重置密码
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "密码重置功能待实现",
      });
    }),
});

