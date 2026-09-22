"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { attachIcon, attachScreenshot, createApp, createAssetUpload, updateApp } from "@/app/admin/actions/apps";
import { DeleteScreenshotButton } from "@/components/admin/delete-screenshot-button";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { suggestSlug } from "@/lib/format";
import { uploadToPresignedUrl } from "@/lib/upload-client";
import { appMetadataSchema, type AppMetadata } from "@/lib/validations";

type ScreenshotItem = {
  id: string;
  imageUrl: string;
  altText: string;
};

type AppFormProps = {
  mode: "create" | "edit";
  app?: AppMetadata & { id: string; iconUrl: string | null };
  screenshots?: ScreenshotItem[];
};

export function AppForm({ mode, app, screenshots = [] }: AppFormProps) {
  const router = useRouter();
  const slugDirty = useRef(mode === "edit");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<AppMetadata>({
    resolver: zodResolver(appMetadataSchema),
    defaultValues: {
      name: app?.name ?? "",
      slug: app?.slug ?? "",
      package_name: app?.package_name ?? "",
      short_description: app?.short_description ?? "",
      description: app?.description ?? "",
    },
  });

  async function onSubmit(values: AppMetadata) {
    setPending(true);
    setError(null);
    setProgress(null);
    let savedId = app?.id;

    try {
      setStatus("앱 정보를 저장하는 중");
      const saved =
        mode === "create"
          ? await createApp(values)
          : await updateApp({ ...values, id: app?.id ?? "" });
      if (!saved.ok) {
        setError(saved.error);
        return;
      }
      savedId = saved.data.id;

      if (iconFile) {
        setStatus("아이콘을 업로드하는 중");
        await sendAsset(saved.data.id, "icon", iconFile, setProgress);
      }

      for (let index = 0; index < screenshotFiles.length; index += 1) {
        const file = screenshotFiles[index];
        setStatus(`스크린샷을 업로드하는 중 (${index + 1}/${screenshotFiles.length})`);
        await sendAsset(saved.data.id, "screenshot", file, setProgress);
      }

      toast.success(mode === "create" ? "앱을 등록했습니다." : "앱 정보를 저장했습니다.");
      router.push("/admin");
      router.refresh();
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "파일을 저장하지 못했습니다.";
      setError(
        savedId
          ? `${message} 앱 정보는 저장되어 있습니다. 수정 화면에서 파일을 다시 올릴 수 있습니다.`
          : message,
      );
      if (savedId && mode === "create") {
        router.push(`/admin/apps/${savedId}`);
        router.refresh();
      }
    } finally {
      setPending(false);
      setStatus(null);
      setProgress(null);
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이름</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  onChange={(event) => {
                    field.onChange(event);
                    if (!slugDirty.current) {
                      form.setValue("slug", suggestSlug(event.target.value), { shouldValidate: true });
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>주소</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  onChange={(event) => {
                    slugDirty.current = true;
                    field.onChange(event);
                  }}
                />
              </FormControl>
              <FormDescription>영문 소문자와 하이픈. 예: household-ledger</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="package_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>패키지 이름</FormLabel>
              <FormControl>
                <Input {...field} className="font-mono" placeholder="kr.ulsan.ldh.myapp" />
              </FormControl>
              <FormDescription>업데이트 API가 앱을 찾는 키입니다. kr.ulsan.ldh 로 시작하는 역도메인을 권장합니다.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="short_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>짧은 설명</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>카드에 보이는 한 줄 설명입니다. 160자 이하.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>설명</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <label htmlFor="icon-file" className="text-sm font-medium">
            아이콘
          </label>
          {app?.iconUrl ? <p className="text-sm text-muted-foreground">현재 아이콘이 있습니다. 새 파일을 고르면 교체됩니다.</p> : null}
          <Input
            id="icon-file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => setIconFile(event.target.files?.[0] ?? null)}
          />
          <p className="text-sm text-muted-foreground">PNG, JPG, WEBP. 5MB 이하.</p>
        </div>

        {screenshots.length > 0 ? (
          <ul className="space-y-3">
            {screenshots.map((shot) => (
              <li key={shot.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <p className="truncate text-sm">{shot.altText || "스크린샷"}</p>
                <DeleteScreenshotButton screenshotId={shot.id} />
              </li>
            ))}
          </ul>
        ) : null}

        <div className="space-y-2">
          <label htmlFor="screenshot-files" className="text-sm font-medium">
            스크린샷 추가
          </label>
          <Input
            id="screenshot-files"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={(event) => setScreenshotFiles(Array.from(event.target.files ?? []))}
          />
        </div>

        {status ? (
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {status}
          </p>
        ) : null}
        {progress != null ? (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            aria-label="업로드 진행률"
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full bg-primary" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? "저장 중" : mode === "create" ? "앱 등록" : "변경 저장"}
        </Button>
      </form>
    </Form>
  );
}

async function sendAsset(
  appId: string,
  kind: "icon" | "screenshot",
  file: File,
  onProgress: (ratio: number) => void,
) {
  const presign = await createAssetUpload({
    appId,
    kind,
    fileName: file.name,
    fileSize: file.size,
  });
  if (!presign.ok) throw new Error(presign.error);
  await uploadToPresignedUrl(presign.data.uploadUrl, file, presign.data.contentType, onProgress);
  if (kind === "icon") {
    const attached = await attachIcon({
      appId,
      objectKey: presign.data.objectKey,
      fileSize: file.size,
    });
    if (!attached.ok) throw new Error(attached.error);
    return;
  }
  const attached = await attachScreenshot({
    appId,
    objectKey: presign.data.objectKey,
    fileSize: file.size,
    altText: "",
  });
  if (!attached.ok) throw new Error(attached.error);
}
