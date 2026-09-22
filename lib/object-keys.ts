import { imageContentType, sanitizeFileName, type Platform } from "@/lib/files";

const UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export function buildReleaseObjectKey(input: {
  appId: string;
  platform: Platform;
  versionCode: number;
  fileName: string;
}): string {
  const safeName = sanitizeFileName(input.fileName);
  return `apps/${input.appId}/releases/${input.platform}/${input.versionCode}/${safeName}`;
}

export function buildIconObjectKey(appId: string, fileName: string): string | null {
  const extension = imageExtension(fileName);
  if (!extension) return null;
  return `apps/${appId}/icon/${crypto.randomUUID()}.${extension}`;
}

export function buildScreenshotObjectKey(appId: string, fileName: string): string | null {
  const extension = imageExtension(fileName);
  if (!extension) return null;
  return `apps/${appId}/screenshots/${crypto.randomUUID()}.${extension}`;
}

export function isSafeObjectKey(appId: string, objectKey: string): boolean {
  if (objectKey.includes("..") || objectKey.includes("\\") || objectKey.startsWith("/")) {
    return false;
  }
  return objectKey.startsWith(`apps/${appId}/`);
}

export function isIconObjectKey(appId: string, objectKey: string): boolean {
  const pattern = new RegExp(`^apps/${escapeRegex(appId)}/icon/${UUID_PATTERN}\\.(png|jpe?g|webp)$`);
  return pattern.test(objectKey);
}

export function isScreenshotObjectKey(appId: string, objectKey: string): boolean {
  const pattern = new RegExp(
    `^apps/${escapeRegex(appId)}/screenshots/${UUID_PATTERN}\\.(png|jpe?g|webp)$`,
  );
  return pattern.test(objectKey);
}

export function isReleaseObjectKey(appId: string, objectKey: string, expected: string): boolean {
  return isSafeObjectKey(appId, objectKey) && objectKey === expected;
}

function imageExtension(fileName: string): string | null {
  const contentType = imageContentType(fileName);
  if (contentType === "image/png") return "png";
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/webp") return "webp";
  return null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
