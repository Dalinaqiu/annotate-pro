import { prisma } from "@/server/db";
import type { Prisma, TaskPriority, TaskStatus } from "@prisma/client";

export const AllowedTransitions: Record<TaskStatus, TaskStatus[]> = {
  PENDING: ["IN_PROGRESS"],
  IN_PROGRESS: ["DONE", "PENDING"],
  DONE: ["TO_REVIEW"],
  TO_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: [],
  REJECTED: ["IN_PROGRESS", "PENDING"],
};

export async function createTasksFromItems(input: {
  projectId: string;
  datasetId: string;
  dataItemIds: string[];
  titlePrefix?: string;
  priority?: TaskPriority;
}) {
  if (!input.dataItemIds.length) return { count: 0 };
  const tasks = input.dataItemIds.map((id, idx) => ({
    projectId: input.projectId,
    datasetId: input.datasetId,
    dataItemId: id,
    title: `${input.titlePrefix ?? "Task"} #${idx + 1}`,
    priority: input.priority ?? ("MEDIUM" as TaskPriority),
  }));
  const res = await prisma.task.createMany({ data: tasks });
  return { count: res.count };
}

export async function createTasksByTimeSlices(input: {
  projectId: string;
  datasetId: string;
  slices: Array<{ dataItemId: string; startMs: number; endMs: number; title?: string; priority?: TaskPriority; }>;
}) {
  if (!input.slices.length) return { count: 0 };
  const data = input.slices.map((s, i) => ({
    projectId: input.projectId,
    datasetId: input.datasetId,
    dataItemId: s.dataItemId,
    title: s.title ?? `Slice ${i + 1} (${s.startMs}-${s.endMs}ms)`,
    priority: s.priority ?? ("MEDIUM" as TaskPriority),
    metadata: { startMs: s.startMs, endMs: s.endMs } as Prisma.InputJsonValue,
  }));
  const res = await prisma.task.createMany({ data });
  return { count: res.count };
}

export async function listTasks(params: {
  projectId?: string;
  datasetId?: string;
  assigneeId?: string;
  status?: TaskStatus[];
  priority?: TaskPriority[];
  take?: number;
  cursor?: string;
}) {
  const where: Prisma.TaskWhereInput = {};
  if (params.projectId) where.projectId = params.projectId;
  if (params.datasetId) where.datasetId = params.datasetId;
  if (params.assigneeId) where.assignedToId = params.assigneeId;
  if (params.status?.length) where.status = { in: params.status } as any;
  if (params.priority?.length) where.priority = { in: params.priority } as any;
  const take = params.take ?? 50;
  const items = await prisma.task.findMany({
    where,
    include: { dataItem: true },
    orderBy: { createdAt: "desc" },
    take,
    ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
  });
  const nextCursor = items.length === take ? items[items.length - 1]?.id : undefined;
  return { items, nextCursor };
}

export async function changeTaskStatus(taskId: string, to: TaskStatus, actorId?: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");
  const allowed = AllowedTransitions[task.status as TaskStatus] ?? [];
  if (!allowed.includes(to)) throw new Error(`Invalid transition: ${task.status} -> ${to}`);
  const updated = await prisma.task.update({ where: { id: taskId }, data: { status: to } });
  await prisma.taskEvent.create({ data: { taskId, type: "STATUS_CHANGED", from: task.status, to, actorId } });
  return updated;
}

export async function bulkChangeStatus(taskIds: string[], to: TaskStatus, actorId?: string) {
  if (!taskIds.length) return { count: 0 };
  // Validate all first
  const tasks = await prisma.task.findMany({ where: { id: { in: taskIds } } });
  for (const t of tasks) {
    if (!(AllowedTransitions[t.status as TaskStatus] ?? []).includes(to)) {
      throw new Error(`Invalid transition for ${t.id}: ${t.status} -> ${to}`);
    }
  }
  const res = await prisma.task.updateMany({ where: { id: { in: taskIds } }, data: { status: to } });
  await prisma.taskEvent.createMany({ data: tasks.map((t) => ({ taskId: t.id, type: "STATUS_CHANGED", from: t.status, to, actorId: actorId ?? null })) });
  return { count: res.count };
}

export async function assignTasksRoundRobin(taskIds: string[], userIds: string[], actorId?: string) {
  if (!taskIds.length || !userIds.length) return { count: 0 };
  const updates: { id: string; assignedToId: string; assignedAt: Date }[] = [];
  let i = 0;
  for (const taskId of taskIds) {
    const userId = userIds[i % userIds.length];
    updates.push({ id: taskId, assignedToId: userId, assignedAt: new Date() });
    i++;
  }
  const tx = await prisma.$transaction([
    prisma.$executeRawUnsafe(
      `-- noop` // keep transaction non-empty for types
    ),
    ...updates.map((u) => prisma.task.update({ where: { id: u.id }, data: { assignedToId: u.assignedToId, assignedAt: u.assignedAt } })),
  ]);
  await prisma.taskEvent.createMany({ data: updates.map((u) => ({ taskId: u.id, type: "ASSIGNED", to: u.assignedToId, actorId: actorId ?? null })) });
  return { count: updates.length };
}

export async function assignTasksLeastLoad(taskIds: string[], userIds: string[], actorId?: string) {
  if (!taskIds.length || !userIds.length) return { count: 0 };
  // Count open workload per user
  const loads = await prisma.task.groupBy({
    by: ["assignedToId"],
    where: { assignedToId: { in: userIds }, status: { in: ["PENDING", "IN_PROGRESS"] as any } },
    _count: { _all: true },
  });
  const map = new Map<string, number>();
  for (const u of userIds) map.set(u, 0);
  for (const l of loads) if (l.assignedToId) map.set(l.assignedToId, l._count?._all ?? 0);

  const updates: { id: string; assignedToId: string; assignedAt: Date }[] = [];
  for (const taskId of taskIds) {
    // pick min load
    let pick = userIds[0];
    let min = Number.MAX_SAFE_INTEGER;
    for (const u of userIds) {
      const val = map.get(u) ?? 0;
      if (val < min) {
        min = val; pick = u;
      }
    }
    updates.push({ id: taskId, assignedToId: pick, assignedAt: new Date() });
    map.set(pick, (map.get(pick) ?? 0) + 1);
  }
  await prisma.$transaction(updates.map((u) => prisma.task.update({ where: { id: u.id }, data: { assignedToId: u.assignedToId, assignedAt: u.assignedAt } })));
  await prisma.taskEvent.createMany({ data: updates.map((u) => ({ taskId: u.id, type: "ASSIGNED", to: u.assignedToId, actorId: actorId ?? null })) });
  return { count: updates.length };
}

export async function unassignTasks(taskIds: string[], actorId?: string) {
  if (!taskIds.length) return { count: 0 };
  const res = await prisma.task.updateMany({ where: { id: { in: taskIds } }, data: { assignedToId: null, assignedAt: null } });
  await prisma.taskEvent.createMany({ data: taskIds.map((id) => ({ taskId: id, type: "UNASSIGNED", actorId: actorId ?? null })) });
  return { count: res.count };
}

export async function deleteTasks(taskIds: string[], actorId?: string) {
  if (!taskIds.length) return { count: 0 };
  // Hard delete for simplicity
  await prisma.taskEvent.createMany({ data: taskIds.map((id) => ({ taskId: id, type: "DELETED", actorId: actorId ?? null })) });
  const res = await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
  return { count: res.count };
}

export async function exportTasksCsv(params: { projectId?: string; datasetId?: string; status?: TaskStatus[] }) {
  const where: Prisma.TaskWhereInput = {};
  if (params.projectId) where.projectId = params.projectId;
  if (params.datasetId) where.datasetId = params.datasetId;
  if (params.status?.length) where.status = { in: params.status } as any;
  const tasks = await prisma.task.findMany({ where, include: { dataItem: true } });
  const header = ["id","projectId","datasetId","dataItemId","title","status","priority","assignedToId","createdAt"].join(",");
  const rows = tasks.map(t => [t.id,t.projectId,t.datasetId,t.dataItemId,JSON.stringify(t.title),t.status,t.priority,t.assignedToId ?? "",t.createdAt.toISOString()].join(","));
  return [header, ...rows].join("\n");
}

export async function getTaskWithItem(taskId: string) {
  return prisma.task.findUnique({ where: { id: taskId }, include: { dataItem: true, project: true } });
}
