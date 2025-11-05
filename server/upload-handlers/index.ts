import type { PutObjectParams } from "@/server/storage";
import { storage } from "@/server/storage";

export type UploadInit = {
  datasetId: string;
  filename: string;
  contentType?: string;
  size?: number;
};

export async function handleDirectUpload(params: UploadInit & { bucket: string; keyPrefix?: string; body: Buffer | Uint8Array | string; }) {
  const key = `${params.keyPrefix ?? params.datasetId}/${Date.now()}_${params.filename}`;
  const putParams: PutObjectParams = {
    bucket: params.bucket,
    key,
    body: params.body,
    contentType: params.contentType,
  };
  const res = await storage.putObject(putParams);
  const url = await storage.getSignedUrl({ bucket: params.bucket, key });
  return { key: res.key, url };
}

// 占位：压缩包解压（zip/tar）
export async function extractArchive(_buffer: Buffer, _options?: { allowedExtensions?: string[] }) {
  // 这里可使用 adm-zip / tar-stream 等实现
  // 暂返回空列表，后续由 Worker 处理
  return [] as Array<{ path: string; content: Buffer }>;
}
