"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { attachIcon, attachScreenshot, createApp, createAssetUpload, updateApp } from "@/app/admin/actions/apps";
import { createReleaseUpload, finalizeRelease } from "@/app/admin/actions/releases";
import { DeleteScreenshotButton } from "@/components/admin/delete-screenshot-button";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { firstIssueMessage } from "@/lib/db-error";
import { acceptForPlatform, platformExtensionLabel, PLATFORMS, PLATFORM_LABEL, type Platform } from "@/lib/files";
import { suggestSlug } from "@/lib/format";
import { uploadToPresignedUrl } from "@/lib/upload-client";
import { appMetadataSchema, releaseMetadataSchema, type AppMetadata } from "@/lib/validations";

const initialReleaseSchema = releaseMetadataSchema.omit({
  appId: true,
  fileName: true,
  fileSize: true,
});

type ScreenshotItem = {
  id: string;
  imageUrl: string;
  altText: string;
};

type AppFormProps = {
  mode: "create" | "edit";
  app?: AppMetadata & { id: string; iconUrl: string | null };
  screenshots?: ScreenshotItem[];
  /** 첫 설치 파일이 없을 때 등록 폼에 릴리즈 입력을 함께 둔다. */
  includeInstaller?: boolean;
};

export function AppForm({ mode, app, screenshots = [], includeInstaller = false }: AppFormProps) {
  const router = useRouter();
  const slugDirty = useRef(mode === "edit");
  const showInstaller = includeInstaller || mode === "create";
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [platform, setPlatform] = useState<Platform>("android");
  const [versionString, setVersionString] = useState("");
  const [versionCode, setVersionCode] = useState("1");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [isMandatory, setIsMandatory] = useState(false);
  const [installerFile, setInstallerFile] = useState<File | null>(null);
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
    const release = showInstaller
      ? initialReleaseSchema.safeParse({
          platform,
          version_string: versionString,
          version_code: Number(versionCode),
          release_notes: releaseNotes,
          is_mandatory: isMandatory,
        })
      : null;

    if (showInstaller) {
      if (!installerFile) {
        setError("설치 파일을 선택해 주세요.");
        setPending(false);
        return;
      }
      if (!release?.success) {
        setError(firstIssueMessage(release?.error.issues ?? []));
        setPending(false);
        return;
      }
    }

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

      if (showInstaller && installerFile && release?.success) {
        setStatus("설치 파일을 업로드하는 중");
        setProgress(0);
        await sendRelease(saved.data.id, release.data, installerFile, setProgress);
      }

      toast.success(mode === "create" ? "앱을 등록했습니다." : "앱 정보를 저장했습니다.");
      router.push("/admin");
      router.refresh();
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "파일을 저장하지 못했습니다.";
      setError(
        savedId
          ? `${message} 앱 정보는 저장되어 있습니다. 새 버전 화면에서 설치 파일을 다시 올릴 수 있습니다.`
          : message,
      );
      if (savedId && mode === "create") {
        router.push(`/admin/apps/${savedId}/releases/new`);
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

        {showInstaller ? (
          <fieldset className="space-y-4 rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-semibold">설치 파일</legend>
            <div className="space-y-2">
              <label htmlFor="release-platform" className="text-sm font-medium">
                플랫폼
              </label>
              <select
                id="release-platform"
                value={platform}
                onChange={(event) => setPlatform(event.target.value as Platform)}
                className="flex h-11 w-full cursor-pointer rounded-lg border border-input bg-card px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {PLATFORMS.map((item) => (
                  <option key={item} value={item}>
                    {PLATFORM_LABEL[item]}
                  </option>
                ))}
              </select>
              <p className="text-sm text-muted-foreground">허용 파일: {platformExtensionLabel(platform)}</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="release-version" className="text-sm font-medium">
                버전 문자열
              </label>
              <Input
                id="release-version"
                className="font-mono"
                placeholder="1.0.9"
                value={versionString}
                onChange={(event) => setVersionString(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="release-code" className="text-sm font-medium">
                버전 코드
              </label>
              <Input
                id="release-code"
                type="number"
                min={1}
                step={1}
                value={versionCode}
                onChange={(event) => setVersionCode(event.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Android라면 versionCode를 그대로 씁니다. 업데이트 API는 이 숫자로 최신 여부를 판단합니다.
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="release-notes" className="text-sm font-medium">
                릴리즈 노트
              </label>
              <Textarea
                id="release-notes"
                value={releaseNotes}
                onChange={(event) => setReleaseNotes(event.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="release-mandatory"
                type="checkbox"
                className="h-4 w-4 cursor-pointer accent-primary"
                checked={isMandatory}
                onChange={(event) => setIsMandatory(event.target.checked)}
              />
              <label htmlFor="release-mandatory" className="cursor-pointer text-sm font-medium">
                필수 업데이트
              </label>
            </div>
            <div className="space-y-2">
              <label htmlFor="installer-file" className="text-sm font-medium">
                설치 파일
              </label>
              <Input
                id="installer-file"
                type="file"
                accept={acceptForPlatform(platform)}
                onChange={(event) => setInstallerFile(event.target.files?.[0] ?? null)}
              />
            </div>
          </fieldset>
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

async function sendRelease(
  appId: string,
  release: {
    platform: Platform;
    version_string: string;
    version_code: number;
    release_notes: string;
    is_mandatory: boolean;
  },
  file: File,
  onProgress: (ratio: number) => void,
) {
  const payload = {
    ...release,
    appId,
    fileName: file.name,
    fileSize: file.size,
  };
  const presign = await createReleaseUpload(payload);
  if (!presign.ok) throw new Error(presign.error);
  await uploadToPresignedUrl(presign.data.uploadUrl, file, presign.data.contentType, onProgress);
  const saved = await finalizeRelease({ ...payload, objectKey: presign.data.objectKey });
  if (!saved.ok) throw new Error(saved.error);
}
