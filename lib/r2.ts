import "server-only";

import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";

const r2EnvSchema = z.object({
  R2_ACCOUNT_ID: z.string().regex(/^[A-Za-z0-9]{1,64}$/, "R2_ACCOUNT_ID 형식이 올바르지 않습니다."),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1).max(63),
  R2_PUBLIC_BASE_URL: z.string().url().startsWith("https://"),
});

export type R2Config = z.infer<typeof r2EnvSchema>;

const PRESIGN_EXPIRES_SECONDS = 60 * 10;

let cachedClient: S3Client | null = null;
let cachedKey = "";

export function getR2Config(): R2Config {
  const parsed = r2EnvSchema.safeParse({
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
  });
  if (!parsed.success) {
    throw new Error("Cloudflare R2 환경 변수가 없습니다. .env.local을 확인해 주세요.");
  }
  return parsed.data;
}

/**
 * R2는 AWS S3 API를 쓰지만 리전 값은 auto여야 한다.
 * SDK 3.729 이후 기본 CRC32 체크섬은 R2가 서명에 포함하지 않아 PUT이 거절된다.
 */
export function getR2Client(): S3Client {
  const config = getR2Config();
  const cacheKey = `${config.R2_ACCOUNT_ID}:${config.R2_ACCESS_KEY_ID}:${config.R2_BUCKET_NAME}`;
  if (cachedClient && cachedKey === cacheKey) return cachedClient;

  const clientConfig = {
    region: "auto",
    endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.R2_ACCESS_KEY_ID,
      secretAccessKey: config.R2_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  } satisfies S3ClientConfig;

  cachedClient = new S3Client(clientConfig);
  cachedKey = cacheKey;
  return cachedClient;
}

export function publicUrlForKey(objectKey: string): string {
  const base = getR2Config().R2_PUBLIC_BASE_URL.replace(/\/$/, "");
  const encoded = objectKey.split("/").map((segment) => encodeURIComponent(segment)).join("/");
  return `${base}/${encoded}`;
}

export async function createPresignedPut(input: {
  objectKey: string;
  contentType: string;
}): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getR2Config().R2_BUCKET_NAME,
    Key: input.objectKey,
    ContentType: input.contentType,
  });
  return getSignedUrl(getR2Client(), command, { expiresIn: PRESIGN_EXPIRES_SECONDS });
}

export async function statObject(
  objectKey: string,
): Promise<{ contentLength: number; contentType: string | undefined } | null> {
  try {
    const result = await getR2Client().send(
      new HeadObjectCommand({
        Bucket: getR2Config().R2_BUCKET_NAME,
        Key: objectKey,
      }),
    );
    return {
      contentLength: result.ContentLength ?? 0,
      contentType: result.ContentType,
    };
  } catch (error) {
    if (isMissingObject(error)) return null;
    throw error;
  }
}

export async function deleteObject(objectKey: string): Promise<void> {
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: getR2Config().R2_BUCKET_NAME,
      Key: objectKey,
    }),
  );
}

/** 앱 삭제 시 해당 앱 접두사의 객체를 비운다. 키는 apps/{uuid}/ 로만 호출한다. */
export async function deletePrefix(prefix: string): Promise<void> {
  if (!prefix.startsWith("apps/") || prefix.includes("..")) {
    throw new Error("허용되지 않은 스토리지 경로입니다.");
  }

  const client = getR2Client();
  const bucket = getR2Config().R2_BUCKET_NAME;
  let continuationToken: string | undefined;

  do {
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    const keys = (listed.Contents ?? [])
      .map((item) => item.Key)
      .filter((key): key is string => Boolean(key));

    if (keys.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: keys.map((key) => ({ Key: key })),
            Quiet: true,
          },
        }),
      );
    }

    continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (continuationToken);
}

function isMissingObject(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return candidate.name === "NotFound" || candidate.$metadata?.httpStatusCode === 404;
}
