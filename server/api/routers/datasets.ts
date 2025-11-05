import { router, protectedProcedure } from "@/libs/trpc";
import { z } from "zod";
import { createDataset, listDatasets, upsertSavedFilter, listSavedFilters, createImportJob } from "@/server/repositories/datasets";
import { addItemsFromUrls, filterSearch, computeQuality } from "@/server/repositories/dataItems";
import { prisma } from "@/server/db";

const filterSchema = z.object({
  text: z.string().optional(),
  labels: z.array(z.string()).optional(),
  annotators: z.array(z.string()).optional(),
  status: z.array(z.enum(["NEW", "IMPORTED", "PROCESSED", "FAILED")).optional(),
  timeFrom: z.string().datetime().optional(),
  timeTo: z.string().datetime().optional(),
});

export const datasetsRouter = router({
  // 创建数据集
  create: protectedProcedure
    .input(z.object({ projectId: z.string(), name: z.string().min(1), type: z.enum(["IMAGE", "TEXT", "AUDIO", "VIDEO", "MULTIMODAL"]), description: z.string().nullable().optional() }))
    .mutation(async ({ input }) => {
      return createDataset(input);
    }),

  // 列出项目下数据集
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => listDatasets(input.projectId)),

  // URL 批量导入（支持多行/CSV/JSON 由前端解析为数组）
  importUrls: protectedProcedure
    .input(z.object({ datasetId: z.string(), urls: z.array(z.object({ url: z.string().url(), mimeType: z.string().optional(), checksum: z.string().optional(), metadata: z.record(z.any()).optional() })) }))
    .mutation(async ({ input }) => {
      const job = await createImportJob({ datasetId: input.datasetId, type: "URL_LIST", params: { count: input.urls.length } });
      const res = await addItemsFromUrls({ datasetId: input.datasetId, urls: input.urls });
      await prisma.importJob.update({ where: { id: job.id }, data: { status: "COMPLETED", progress: 100, finishedAt: new Date() } });
      return { imported: res.count, jobId: job.id };
    }),

  // 本地上传：返回上传目标（占位：本地签名URL）
  initUpload: protectedProcedure
    .input(z.object({ datasetId: z.string(), filename: z.string().min(1), contentType: z.string().optional() }))
    .mutation(async ({ input }) => {
      const bucket = process.env.UPLOAD_BUCKET ?? "uploads";
      const key = `${input.datasetId}/${Date.now()}_${input.filename}`;
      // 这里实际应生成 PUT 签名URL
      const url = `local://${bucket}/${key}`;
      // 记录导入任务（LOCAL_UPLOAD）
      const job = await createImportJob({ datasetId: input.datasetId, type: "LOCAL_UPLOAD", params: { filename: input.filename, key } });
      return { uploadUrl: url, key, jobId: job.id };
    }),

  // 触发云同步任务（由 Worker 异步执行）
  cloudSync: protectedProcedure
    .input(z.object({ datasetId: z.string(), provider: z.enum(["S3", "GCS", "AZURE", "R2"]), bucket: z.string(), prefix: z.string().optional(), cron: z.string().optional() }))
    .mutation(async ({ input }) => {
      const job = await createImportJob({ datasetId: input.datasetId, type: "CLOUD_SYNC", params: input });
      return { jobId: job.id };
    }),

  // 筛选与搜索
  search: protectedProcedure
    .input(z.object({ datasetId: z.string(), query: filterSchema.default({}), take: z.number().min(1).max(200).default(50), cursor: z.string().optional() }))
    .query(async ({ input }) => {
      const q = { ...input.query, timeFrom: input.query.timeFrom ? new Date(input.query.timeFrom) : undefined, timeTo: input.query.timeTo ? new Date(input.query.timeTo) : undefined } as any;
      return filterSearch(input.datasetId, q, input.take, input.cursor);
    }),

  // 保存命名筛选
  saveFilter: protectedProcedure
    .input(z.object({ datasetId: z.string(), name: z.string().min(1), query: filterSchema }))
    .mutation(async ({ ctx, input }) => {
      const saved = await upsertSavedFilter({ datasetId: input.datasetId, userId: ctx.user.id as string, name: input.name, query: input.query });
      return saved;
    }),

  // 获取用户的保存筛选
  myFilters: protectedProcedure
    .input(z.object({ datasetId: z.string() }))
    .query(async ({ ctx, input }) => listSavedFilters(input.datasetId, ctx.user.id as string)),

  // 数据质量检查 + 报告
  qualityCheck: protectedProcedure
    .input(z.object({ datasetId: z.string() }))
    .mutation(async ({ input }) => {
      const { score, summary } = await computeQuality(input.datasetId);
      const report = await prisma.qualityReport.create({ data: { datasetId: input.datasetId, score, summary } });
      return report;
    }),
});
