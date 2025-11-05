import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";

export async function getLatestAnnotation(taskId: string, userId?: string) {
  return prisma.annotation.findFirst({
    where: { taskId, ...(userId ? { userId } : {}) },
    orderBy: [{ version: "desc" }, { updatedAt: "desc" }],
  });
}

export async function saveAnnotationDraft(input: {
  taskId: string;
  userId: string;
  type: string;
  payload: Prisma.InputJsonValue;
}) {
  const last = await prisma.annotation.findFirst({ where: { taskId: input.taskId, userId: input.userId }, orderBy: { version: "desc" } });
  const version = (last?.version ?? 0) + 1;
  return prisma.annotation.create({ data: { ...input, version, status: "DRAFT" } });
}

export async function saveAnnotation(input: {
  taskId: string;
  userId: string;
  type: string;
  payload: Prisma.InputJsonValue;
}) {
  const last = await prisma.annotation.findFirst({ where: { taskId: input.taskId, userId: input.userId }, orderBy: { version: "desc" } });
  const version = (last?.version ?? 0) + 1;
  return prisma.annotation.create({ data: { ...input, version, status: "SAVED" } });
}

export async function submitAnnotation(input: {
  taskId: string;
  userId: string;
  type: string;
  payload: Prisma.InputJsonValue;
}) {
  const last = await prisma.annotation.findFirst({ where: { taskId: input.taskId, userId: input.userId }, orderBy: { version: "desc" } });
  const version = (last?.version ?? 0) + 1;
  const ann = await prisma.annotation.create({ data: { ...input, version, status: "SUBMITTED" } });
  // 标注提交后，推动任务进入待审核
  await prisma.task.update({ where: { id: input.taskId }, data: { status: "TO_REVIEW" } });
  return ann;
}

