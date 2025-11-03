import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/server/db";
import { router, adminProcedure, protectedProcedure } from "@/libs/trpc";
import { hashPassword } from "@/server/auth";

export const usersRouter = router({
  // 获取用户列表（管理员）
  list: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING_VERIFICATION"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { page, pageSize, search, status } = input;
      const skip = (page - 1) * pageSize;

      const where: any = {};
      if (search) {
        where.OR = [
          { email: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
        ];
      }
      if (status) {
        where.status = status;
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: pageSize,
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            status: true,
            twoFactorEnabled: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                sessions: true,
                apiKeys: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.user.count({ where }),
      ]);

      return {
        users,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // 获取当前用户信息
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        status: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
    }

    return user;
  }),

  // 更新当前用户信息
  updateMe: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        image: z.string().url().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await prisma.user.update({
        where: { id: ctx.user.id },
        data: input,
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
        },
      });

      // 记录审计日志
      await prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "UPDATE",
          resource: "User",
          resourceId: ctx.user.id,
          details: input,
        },
      });

      return user;
    }),

  // 更新密码
  updatePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { passwordHash: true },
      });

      if (!user?.passwordHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "用户未设置密码",
        });
      }

      const { compare } = await import("bcryptjs");
      const isValid = await compare(input.currentPassword, user.passwordHash);

      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "当前密码错误",
        });
      }

      const newPasswordHash = await hashPassword(input.newPassword);

      await prisma.user.update({
        where: { id: ctx.user.id },
        data: { passwordHash: newPasswordHash },
      });

      await prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "UPDATE",
          resource: "User",
          resourceId: ctx.user.id,
          details: { field: "password" },
        },
      });

      return { success: true };
    }),

  // 创建用户（管理员）
  create: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().optional(),
        status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).default("ACTIVE"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "该邮箱已被使用",
        });
      }

      const passwordHash = await hashPassword(input.password);
      
      const user = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          name: input.name,
          status: input.status,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "CREATE",
          resource: "User",
          resourceId: user.id,
          details: { email: user.email },
        },
      });

      return user;
    }),

  // 更新用户（管理员）
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING_VERIFICATION"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;

      const user = await prisma.user.update({
        where: { id },
        data,
      });

      await prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "UPDATE",
          resource: "User",
          resourceId: id,
          details: data,
        },
      });

      return user;
    }),

  // 删除用户（管理员）
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (input.id === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "不能删除自己的账户",
        });
      }

      await prisma.user.delete({
        where: { id: input.id },
      });

      await prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "DELETE",
          resource: "User",
          resourceId: input.id,
        },
      });

      return { success: true };
    }),
});

