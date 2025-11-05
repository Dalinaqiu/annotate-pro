import { router, protectedProcedure } from "@/libs/trpc";
import { z } from "zod";
import {
  AllowedTransitions,
  assignTasksLeastLoad,
  assignTasksRoundRobin,
  bulkChangeStatus,
  changeTaskStatus,
  createTasksByTimeSlices,
  createTasksFromItems,
  deleteTasks,
  exportTasksCsv,
  listTasks,
  unassignTasks,
} from "@/server/repositories/tasks";

export const tasksRouter = router({
  // 批量创建：按数据项列表
  createFromItems: protectedProcedure
    .input(z.object({ projectId: z.string(), datasetId: z.string(), dataItemIds: z.array(z.string()).min(1), titlePrefix: z.string().optional(), priority: z.enum(["LOW","MEDIUM","HIGH","URGENT"]).optional() }))
    .mutation(async ({ input }) => createTasksFromItems(input)),

  // 批量创建：按时间切片（音频/视频）
  createByTimeSlices: protectedProcedure
    .input(z.object({ projectId: z.string(), datasetId: z.string(), slices: z.array(z.object({ dataItemId: z.string(), startMs: z.number().nonnegative(), endMs: z.number().positive(), title: z.string().optional(), priority: z.enum(["LOW","MEDIUM","HIGH","URGENT"]).optional() })).min(1) }))
    .mutation(async ({ input }) => createTasksByTimeSlices(input)),

  // 列表/查询
  list: protectedProcedure
    .input(z.object({ projectId: z.string().optional(), datasetId: z.string().optional(), assigneeId: z.string().optional(), status: z.array(z.enum(["PENDING","IN_PROGRESS","DONE","TO_REVIEW","APPROVED","REJECTED"]).optional()).optional(), priority: z.array(z.enum(["LOW","MEDIUM","HIGH","URGENT"]).optional()).optional(), take: z.number().min(1).max(200).optional(), cursor: z.string().optional() }))
    .query(async ({ input }) => listTasks(input)),

  // 状态流转（单个/批量）
  changeStatus: protectedProcedure
    .input(z.object({ taskId: z.string(), to: z.enum(["PENDING","IN_PROGRESS","DONE","TO_REVIEW","APPROVED","REJECTED"]) }))
    .mutation(async ({ ctx, input }) => changeTaskStatus(input.taskId, input.to, ctx.user?.id as string | undefined)),

  bulkChangeStatus: protectedProcedure
    .input(z.object({ taskIds: z.array(z.string()).min(1), to: z.enum(["PENDING","IN_PROGRESS","DONE","TO_REVIEW","APPROVED","REJECTED"]) }))
    .mutation(async ({ ctx, input }) => bulkChangeStatus(input.taskIds, input.to, ctx.user?.id as string | undefined)),

  // 分配/取消分配
  assignRoundRobin: protectedProcedure
    .input(z.object({ taskIds: z.array(z.string()).min(1), userIds: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => assignTasksRoundRobin(input.taskIds, input.userIds, ctx.user?.id as string | undefined)),

  assignLeastLoad: protectedProcedure
    .input(z.object({ taskIds: z.array(z.string()).min(1), userIds: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => assignTasksLeastLoad(input.taskIds, input.userIds, ctx.user?.id as string | undefined)),

  unassign: protectedProcedure
    .input(z.object({ taskIds: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => unassignTasks(input.taskIds, ctx.user?.id as string | undefined)),

  // 导出 CSV
  exportCsv: protectedProcedure
    .input(z.object({ projectId: z.string().optional(), datasetId: z.string().optional(), status: z.array(z.enum(["PENDING","IN_PROGRESS","DONE","TO_REVIEW","APPROVED","REJECTED"]).optional()).optional() }))
    .query(async ({ input }) => exportTasksCsv(input)),

  // 支持前端显示允许的状态迁移（用于禁用非法按钮）
  allowedTransitions: protectedProcedure
    .query(() => AllowedTransitions),
});

