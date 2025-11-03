import { z } from "zod";
import { prisma } from "@/server/db";
import { router, adminProcedure } from "@/libs/trpc";

export const auditRouter = router({
  // 获取审计日志列表
  list: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(50),
        userId: z.string().optional(),
        action: z.string().optional(),
        resource: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const { page, pageSize, userId, action, resource, startDate, endDate } = input;
      const skip = (page - 1) * pageSize;

      const where: any = {};
      if (userId) where.userId = userId;
      if (action) where.action = action;
      if (resource) where.resource = resource;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.auditLog.count({ where }),
      ]);

      return {
        logs,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // 导出CSV
  export: adminProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        action: z.string().optional(),
        resource: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const where: any = {};
      if (input.userId) where.userId = input.userId;
      if (input.action) where.action = input.action;
      if (input.resource) where.resource = input.resource;
      if (input.startDate || input.endDate) {
        where.createdAt = {};
        if (input.startDate) where.createdAt.gte = input.startDate;
        if (input.endDate) where.createdAt.lte = input.endDate;
      }

      const logs = await prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10000, // 限制导出数量
      });

      // 转换为CSV格式
      const headers = ["时间", "用户", "操作", "资源", "资源ID", "IP地址", "详情"];
      const rows = logs.map((log) => [
        log.createdAt.toISOString(),
        log.user?.email || "未知",
        log.action,
        log.resource,
        log.resourceId || "",
        log.ipAddress || "",
        JSON.stringify(log.details || {}),
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

      return csvContent;
    }),
});

