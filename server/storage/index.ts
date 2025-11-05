export type PutObjectParams = {
  bucket: string;
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
};

export type GetSignedUrlParams = {
  bucket: string;
  key: string;
  expiresInSeconds?: number;
};

export interface StorageProvider {
  putObject(params: PutObjectParams): Promise<{ key: string }>;
  getSignedUrl(params: GetSignedUrlParams): Promise<string>;
  exists(bucket: string, key: string): Promise<boolean>;
}

// Local no-op provider (placeholder)
export class LocalStorageProvider implements StorageProvider {
  async putObject(params: PutObjectParams) {
    // In a real impl, write to disk or a dev bucket
    return { key: `${params.bucket}/${params.key}` };
  }
  async getSignedUrl(params: GetSignedUrlParams) {
    return `local://${params.bucket}/${params.key}`;
  }
  async exists(_bucket: string, _key: string) {
    return true;
  }
}

// S3/R2 placeholder provider
export class S3LikeStorageProvider implements StorageProvider {
  private endpoint?: string;
  constructor(opts?: { endpoint?: string }) {
    this.endpoint = opts?.endpoint;
  }
  async putObject(params: PutObjectParams) {
    // TODO: integrate @aws-sdk/client-s3
    return { key: `${params.bucket}/${params.key}` };
  }
  async getSignedUrl(params: GetSignedUrlParams) {
    return `${this.endpoint ?? "s3"}://${params.bucket}/${params.key}?signed=1&exp=${params.expiresInSeconds ?? 900}`;
  }
  async exists(_bucket: string, _key: string) {
    return true;
  }
}

export const storage = new LocalStorageProvider();
