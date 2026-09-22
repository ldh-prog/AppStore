"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { firstIssueMessage, mapDbError, type ActionResult } from "@/lib/db-error";
import { IMAGE_MAX_BYTES, imageContentType } from "@/lib/files";
import {
  buildIconObjectKey,
  buildScreenshotObjectKey,
  isIconObjectKey,
  isScreenshotObjectKey,
} from "@/lib/object-keys";
import { createPresignedPut, deleteObject, deletePrefix, publicUrlForKey, statObject } from "@/lib/r2";
import { appMetadataSchema, assetUploadSchema, attachAssetSchema } from "@/lib/validations";

export async function createApp(
  input: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const parsed = appMetadataSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error.issues) };

  const admin = await requireAdmin();
  if (!admin.ok) return admin;

  const { data, error } = await admin.supabase
    .from("apps")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      package_name: parsed.data.package_name,
      short_description: parsed.data.short_description,
      description: parsed.data.description,
    })
    .select("id, slug")
    .single();

  if (error || !data) return { ok: false, error: mapDbError(error ?? {}) };

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, data };
}

const appUpdateSchema = appMetadataSchema.extend({
  id: assetUploadSchema.shape.appId,
});

export async function updateApp(
  input: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const result = appUpdateSchema.safeParse(input);
  if (!result.success) return { ok: false, error: firstIssueMessage(result.error.issues) };

  const admin = await requireAdmin();
  if (!admin.ok) return admin;

  const { data, error } = await admin.supabase
    .from("apps")
    .update({
      name: result.data.name,
      slug: result.data.slug,
      package_name: result.data.package_name,
      short_description: result.data.short_description,
      description: result.data.description,
    })
    .eq("id", result.data.id)
    .select("id, slug")
    .maybeSingle();

  if (error) return { ok: false, error: mapDbError(error) };
  if (!data) return { ok: false, error: "앱을 찾을 수 없습니다." };

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/apps/${data.slug}`);
  revalidatePath(`/admin/apps/${data.id}`);
  return { ok: true, data };
}

export async function deleteApp(appId: string): Promise<ActionResult<{ id: string }>> {
  const idResult = assetUploadSchema.shape.appId.safeParse(appId);
  if (!idResult.success) return { ok: false, error: "앱 식별자가 올바르지 않습니다." };

  const admin = await requireAdmin();
  if (!admin.ok) return admin;

  try {
    await deletePrefix(`apps/${idResult.data}/`);
  } catch (error) {
    console.error("deleteApp storage", error);
    return { ok: false, error: "스토리지의 파일을 삭제하지 못했습니다. 앱 정보는 그대로 두었습니다." };
  }

  const { error } = await admin.supabase.from("apps").delete().eq("id", idResult.data);
  if (error) return { ok: false, error: mapDbError(error) };

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, data: { id: idResult.data } };
}

export async function createAssetUpload(input: unknown): Promise<
  ActionResult<{ uploadUrl: string; objectKey: string; contentType: string }>
> {
  const parsed = assetUploadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error.issues) };
  if (parsed.data.fileSize > IMAGE_MAX_BYTES) {
    return { ok: false, error: "이미지는 5MB 이하만 올릴 수 있습니다." };
  }

  const contentType = imageContentType(parsed.data.fileName);
  if (!contentType) {
    return { ok: false, error: "이미지는 PNG, JPG, WEBP만 올릴 수 있습니다." };
  }

  const admin = await requireAdmin();
  if (!admin.ok) return admin;

  const { data: app, error } = await admin.supabase
    .from("apps")
    .select("id")
    .eq("id", parsed.data.appId)
    .maybeSingle();
  if (error) return { ok: false, error: mapDbError(error) };
  if (!app) return { ok: false, error: "앱을 찾을 수 없습니다." };

  const objectKey =
    parsed.data.kind === "icon"
      ? buildIconObjectKey(parsed.data.appId, parsed.data.fileName)
      : buildScreenshotObjectKey(parsed.data.appId, parsed.data.fileName);
  if (!objectKey) return { ok: false, error: "이미지 확장자를 확인해 주세요." };

  try {
    const uploadUrl = await createPresignedPut({ objectKey, contentType });
    return { ok: true, data: { uploadUrl, objectKey, contentType } };
  } catch (uploadError) {
    console.error("createAssetUpload", uploadError);
    return { ok: false, error: "업로드 주소를 만들지 못했습니다. R2 환경 변수를 확인해 주세요." };
  }
}

export async function attachIcon(input: unknown): Promise<ActionResult<{ iconUrl: string }>> {
  const parsed = attachAssetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error.issues) };
  if (!isIconObjectKey(parsed.data.appId, parsed.data.objectKey)) {
    return { ok: false, error: "아이콘 경로가 올바르지 않습니다." };
  }

  const verified = await verifyUploadedImage(parsed.data.objectKey, parsed.data.fileSize);
  if (!verified.ok) return verified;

  const admin = await requireAdmin();
  if (!admin.ok) return admin;

  const { data: existing, error: readError } = await admin.supabase
    .from("apps")
    .select("icon_object_key, slug")
    .eq("id", parsed.data.appId)
    .maybeSingle();
  if (readError) return { ok: false, error: mapDbError(readError) };
  if (!existing) return { ok: false, error: "앱을 찾을 수 없습니다." };

  const iconUrl = publicUrlForKey(parsed.data.objectKey);
  const { error } = await admin.supabase
    .from("apps")
    .update({ icon_url: iconUrl, icon_object_key: parsed.data.objectKey })
    .eq("id", parsed.data.appId);
  if (error) return { ok: false, error: mapDbError(error) };

  if (existing.icon_object_key && existing.icon_object_key !== parsed.data.objectKey) {
    await deleteObject(existing.icon_object_key).catch((deleteError) => {
      console.error("attachIcon cleanup", deleteError);
    });
  }

  revalidatePath("/");
  revalidatePath(`/apps/${existing.slug}`);
  revalidatePath("/admin");
  return { ok: true, data: { iconUrl } };
}

export async function attachScreenshot(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = attachAssetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error.issues) };
  if (!isScreenshotObjectKey(parsed.data.appId, parsed.data.objectKey)) {
    return { ok: false, error: "스크린샷 경로가 올바르지 않습니다." };
  }

  const verified = await verifyUploadedImage(parsed.data.objectKey, parsed.data.fileSize);
  if (!verified.ok) return verified;

  const admin = await requireAdmin();
  if (!admin.ok) return admin;

  const { data: current, error: listError } = await admin.supabase
    .from("screenshots")
    .select("sort_order")
    .eq("app_id", parsed.data.appId)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (listError) return { ok: false, error: mapDbError(listError) };

  const nextOrder = (current?.[0]?.sort_order ?? -1) + 1;
  const { data, error } = await admin.supabase
    .from("screenshots")
    .insert({
      app_id: parsed.data.appId,
      image_url: publicUrlForKey(parsed.data.objectKey),
      r2_object_key: parsed.data.objectKey,
      alt_text: parsed.data.altText ?? "",
      sort_order: nextOrder,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: mapDbError(error ?? {}) };

  const { data: app } = await admin.supabase
    .from("apps")
    .select("slug")
    .eq("id", parsed.data.appId)
    .maybeSingle();
  revalidatePath("/");
  if (app) revalidatePath(`/apps/${app.slug}`);
  revalidatePath(`/admin/apps/${parsed.data.appId}`);
  return { ok: true, data: { id: data.id } };
}

export async function deleteScreenshot(screenshotId: string): Promise<ActionResult<{ id: string }>> {
  const idResult = assetUploadSchema.shape.appId.safeParse(screenshotId);
  if (!idResult.success) return { ok: false, error: "스크린샷 식별자가 올바르지 않습니다." };

  const admin = await requireAdmin();
  if (!admin.ok) return admin;

  const { data: shot, error } = await admin.supabase
    .from("screenshots")
    .select("id, app_id, r2_object_key")
    .eq("id", idResult.data)
    .maybeSingle();
  if (error) return { ok: false, error: mapDbError(error) };
  if (!shot) return { ok: false, error: "스크린샷을 찾을 수 없습니다." };

  if (shot.r2_object_key) {
    try {
      await deleteObject(shot.r2_object_key);
    } catch (deleteError) {
      console.error("deleteScreenshot", deleteError);
      return { ok: false, error: "스토리지에서 스크린샷을 삭제하지 못했습니다." };
    }
  }

  const { error: deleteError } = await admin.supabase.from("screenshots").delete().eq("id", shot.id);
  if (deleteError) return { ok: false, error: mapDbError(deleteError) };

  const { data: app } = await admin.supabase.from("apps").select("slug").eq("id", shot.app_id).maybeSingle();
  if (app) revalidatePath(`/apps/${app.slug}`);
  revalidatePath(`/admin/apps/${shot.app_id}`);
  return { ok: true, data: { id: shot.id } };
}

async function verifyUploadedImage(
  objectKey: string,
  fileSize: number,
): Promise<ActionResult<null>> {
  try {
    const stat = await statObject(objectKey);
    if (!stat) {
      return { ok: false, error: "스토리지에서 이미지를 찾지 못했습니다. 업로드를 다시 시도해 주세요." };
    }
    if (stat.contentLength !== fileSize) {
      await deleteObject(objectKey).catch(() => undefined);
      return { ok: false, error: "업로드된 파일 크기가 선택한 파일과 다릅니다." };
    }
    return { ok: true, data: null };
  } catch (error) {
    console.error("verifyUploadedImage", error);
    return { ok: false, error: "업로드 결과를 확인하지 못했습니다. R2 환경 변수를 확인해 주세요." };
  }
}
