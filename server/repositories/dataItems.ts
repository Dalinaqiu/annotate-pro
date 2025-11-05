import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";

export async function addItemsFromUrls(input: {
  datasetId: string;
  urls: Array<{ url: string; mimeType?: string | null; checksum?: string | null; metadata?: Record<string, unknown> | null }>;
}) {
  if (!input.urls.length) return { count: 0 };
  const data = input.urls.map((u) => ({
    datasetId: input.datasetId,
    sourceUri: u.url,
    mimeType: u.mimeType ?? null,
    checksum: u.checksum ?? null,
    metadata: (u.metadata ?? null) as Prisma.InputJsonValue,
    status: "IMPORTED" as const,
  }));
  const res = await prisma.dataItem.createMany({ data, skipDuplicates: true });
  return { count: res.count };
}

export type FilterQuery = {
  text?: string;
  labels?: string[]; // 预留：从 metadata 中搜索
  annotators?: string[]; // 预留：如后续建立标注-人员关联
  status?: ("NEW" | "IMPORTED" | "PROCESSED" | "FAILED")[];
  timeFrom?: Date;
  timeTo?: Date;
};

export async function filterSearch(datasetId: string, query: FilterQuery, take = 50, cursor?: string) {
  const where: Prisma.DataItemWhereInput = { datasetId };

  if (query.text) {
    // 简化：对 sourceUri + mimeType 做全文-like 搜索
    where.OR = [
      { sourceUri: { contains: query.text, mode: "insensitive" } },
      { mimeType: { contains: query.text, mode: "insensitive" } },
    ];
  }
  if (query.status && query.status.length) {
    where.status = { in: query.status } as any;
  }
  if (query.timeFrom || query.timeTo) {
    where.createdAt = {
      gte: query.timeFrom,
      lte: query.timeTo,
    };
  }
  // 预留：labels/annotators 可基于关联或 JSON 路径查询实现

  const res = await prisma.dataItem.findMany({
    where,
    take,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" },
  });

  const nextCursor = res.length === take ? res[res.length - 1]?.id : undefined;
  return { items: res, nextCursor };
}

// 简化版数据质量检查：完整性/重复/格式（基于 mimeType）
export async function computeQuality(datasetId: string) {
  const total = await prisma.dataItem.count({ where: { datasetId } });
  const missingMime = await prisma.dataItem.count({ where: { datasetId, mimeType: null } });
  const failed = await prisma.dataItem.count({ where: { datasetId, status: "FAILED" } });

  // 以 checksum 去重（非空）
  const checksums = await prisma.dataItem.groupBy({
    by: ["checksum"],
    where: { datasetId, NOT: { checksum: null } },
    _count: { checksum: true },
    having: { checksum: { _count: { gt: 1 } } },
  });
  const duplicates = checksums.reduce((acc, c) => acc + (c._count?.checksum ?? 0) - 1, 0);

  // 简单格式验证：mimeType 前缀匹配（图片/文本/音频/视频）
  const badFormat = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*)::int AS count
    FROM data_items
    WHERE dataset_id = ${datasetId}
      AND mime_type IS NOT NULL
      AND NOT (
        mime_type ILIKE 'image/%' OR
        mime_type ILIKE 'text/%' OR
        mime_type ILIKE 'audio/%' OR
        mime_type ILIKE 'video/%'
      )
  `;
  const badFormatCount = Array.isArray(badFormat) && badFormat[0]?.count ? Number(badFormat[0].count) : 0;

  const completeness = total ? (1 - missingMime / total) : 0;
  const duplication = total ? (1 - duplicates / total) : 1;
  const format = total ? (1 - badFormatCount / total) : 1;

  // 简单加权求分
  const score = Number(((completeness * 0.4) + (duplication * 0.3) + (format * 0.3)).toFixed(4));

  const summary = {
    total,
    missingMime,
    duplicates,
    badFormat: badFormatCount,
    metrics: { completeness, duplication, format },
  };

  return { score, summary };
}

