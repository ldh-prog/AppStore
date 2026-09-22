"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { firstIssueMessage, mapDbError, type ActionResult } from "@/lib/db-error";
import { INSTALLER_MAX_BYTES, installerContentType, sanitizeFileName } from "@/lib/files";
import { buildReleaseObjectKey, isReleaseObjectKey } from "@/lib/object-keys";
import { createPresignedPut, deleteObject, publicUrlForKey, statObject } from "@/lib/r2";
import { z } from "zod";
import { releaseMetadataSchema } from "@/lib/validations";

const finalizeSchema = releaseMetadataSchema.extend({
  objectKey: z.string().min(1).max(500),
});

export async function createReleaseUpload(input: unknown): Promise<
  ActionResult<{ uploadUrl: string; objectKey: string; contentType: string }>
> {
  const parsed = releaseMetadataSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error.issues) };

  const fileCheck = validateInstaller(parsed.data.platform, parsed.data.fileName, parsed.data.fileSize);
  if (!fileCheck.ok) return fileCheck;

  const admin = await requireAdmin();
  if (!admin.ok) return admin;

  const { data: app, error } = await admin.supabase
    .from("apps")
    .select("id")
    .eq("id", parsed.data.appId)
    .maybeSingle();
  if (error) return { ok: false, error: mapDbError(error) };
  if (!app) return { ok: false, error: "앱을 찾을 수 없습니다." };

  const objectKey = buildReleaseObjectKey({
    appId: parsed.data.appId,
    platform: parsed.data.platform,
    versionCode: parsed.data.version_code,
    fileName: parsed.data.fileName,
  });

  try {
    const uploadUrl = await createPresignedPut({
      objectKey,
      contentType: fileCheck.data,
    });
    return { ok: true, data: { uploadUrl, objectKey, contentType: fileCheck.data } };
  } catch (uploadError) {
    console.error("createReleaseUpload", uploadError);
    return { ok: false, error: "업로드 주소를 만들지 못했습니다. R2 환경 변수를 확인해 주세요." };
  }
}

export async function finalizeRelease(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = finalizeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error.issues) };

  const fileCheck = validateInstaller(parsed.data.platform, parsed.data.fileName, parsed.data.fileSize);
  if (!fileCheck.ok) return fileCheck;

  const objectKey = buildReleaseObjectKey({
    appId: parsed.data.appId,
    platform: parsed.data.platform,
    versionCode: parsed.data.version_code,
    fileName: parsed.data.fileName,
  });

  if (!isReleaseObjectKey(parsed.data.appId, parsed.data.objectKey, objectKey)) {
    return { ok: false, error: "업로드 경로가 요청한 버전과 일치하지 않습니다." };
  }

  try {
    const stat = await statObject(objectKey);
    if (!stat) {
      return { ok: false, error: "스토리지에서 설치 파일을 찾지 못했습니다. 업로드를 다시 시도해 주세요." };
    }
    if (stat.contentLength !== parsed.data.fileSize) {
      await deleteObject(objectKey).catch(() => undefined);
      return { ok: false, error: "업로드된 파일 크기가 선택한 파일과 다릅니다." };
    }
  } catch (error) {
    console.error("finalizeRelease stat", error);
    return { ok: false, error: "업로드 결과를 확인하지 못했습니다. R2 환경 변수를 확인해 주세요." };
  }

  const admin = await requireAdmin();
  if (!admin.ok) return admin;

  const { data: app, error: appError } = await admin.supabase
    .from("apps")
    .select("slug")
    .eq("id", parsed.data.appId)
    .maybeSingle();
  if (appError) return { ok: false, error: mapDbError(appError) };
  if (!app) return { ok: false, error: "앱을 찾을 수 없습니다." };

  const { data, error } = await admin.supabase
    .from("releases")
    .insert({
      app_id: parsed.data.appId,
      version_string: parsed.data.version_string,
      version_code: parsed.data.version_code,
      platform: parsed.data.platform,
      download_url: publicUrlForKey(objectKey),
      r2_object_key: objectKey,
      file_name: sanitizeFileName(parsed.data.fileName),
      file_size_bytes: parsed.data.fileSize,
      release_notes: parsed.data.release_notes,
      is_mandatory: parsed.data.is_mandatory,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await admin.supabase
        .from("releases")
        .select("id, r2_object_key")
        .eq("app_id", parsed.data.appId)
        .eq("platform", parsed.data.platform)
        .eq("version_code", parsed.data.version_code)
        .maybeSingle();
      if (existing && existing.r2_object_key === objectKey) {
        return { ok: true, data: { id: existing.id } };
      }
    }
    return { ok: false, error: mapDbError(error) };
  }

  if (!data) return { ok: false, error: "릴리즈를 저장하지 못했습니다." };

  revalidatePath("/");
  revalidatePath(`/apps/${app.slug}`);
  revalidatePath("/admin");
  revalidatePath(`/admin/apps/${parsed.data.appId}`);
  return { ok: true, data: { id: data.id } };
}

function validateInstaller(
  platform: "android" | "windows" | "macos" | "linux",
  fileName: string,
  fileSize: number,
): ActionResult<string> {
  if (fileSize > INSTALLER_MAX_BYTES) {
    return { ok: false, error: "설치 파일은 2GB 이하만 올릴 수 있습니다." };
  }
  const contentType = installerContentType(platform, fileName);
  if (!contentType) {
    return { ok: false, error: "선택한 플랫폼에서 허용하지 않는 파일 형식입니다." };
  }
  return { ok: true, data: contentType };
}
