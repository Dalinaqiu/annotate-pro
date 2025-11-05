import { prisma } from "@/server/db";
import type { DatasetType, Prisma } from "@prisma/client";

export async function createDataset(input: {
  projectId: string;
  name: string;
  type: DatasetType;
  description?: string | null;
}) {
  return prisma.dataset.create({ data: input });
}

export async function getDataset(id: string) {
  return prisma.dataset.findUnique({ where: { id } });
}

export async function listDatasets(projectId: string) {
  return prisma.dataset.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}

export async function upsertSavedFilter(input: {
  datasetId: string;
  userId: string;
  name: string;
  query: Prisma.JsonValue;
}) {
  return prisma.savedFilter.upsert({
    where: {
      datasetId_userId_name: {
        datasetId: input.datasetId,
        userId: input.userId,
        name: input.name,
      },
    },
    update: { query: input.query },
    create: input,
  });
}

export async function listSavedFilters(datasetId: string, userId: string) {
  return prisma.savedFilter.findMany({
    where: { datasetId, userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createImportJob(input: {
  datasetId: string;
  type: "LOCAL_UPLOAD" | "CLOUD_SYNC" | "URL_LIST" | "PREANNOTATION";
  params: Prisma.JsonValue;
}) {
  return prisma.importJob.create({ data: input });
}

export async function updateImportJob(
  id: string,
  data: Partial<{
    status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
    progress: number;
    error: string | null;
    startedAt: Date | null;
    finishedAt: Date | null;
  }>
) {
  return prisma.importJob.update({ where: { id }, data });
}

