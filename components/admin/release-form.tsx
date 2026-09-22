"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { createReleaseUpload, finalizeRelease } from "@/app/admin/actions/releases";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { acceptForPlatform, platformExtensionLabel, PLATFORMS, PLATFORM_LABEL, type Platform } from "@/lib/files";
import { uploadToPresignedUrl } from "@/lib/upload-client";
import { releaseMetadataSchema } from "@/lib/validations";

const formSchema = releaseMetadataSchema.omit({ appId: true, fileName: true, fileSize: true });
type FormValues = z.infer<typeof formSchema>;

type ReleaseFormProps = {
  appId: string;
  latestCodes: Partial<Record<Platform, number>>;
};

export function ReleaseForm({ appId, latestCodes }: ReleaseFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      platform: "android",
      version_string: "",
      version_code: 1,
      release_notes: "",
      is_mandatory: false,
    },
  });

  const platform = form.watch("platform");
  const currentMax = latestCodes[platform];

  async function onSubmit(values: FormValues) {
    if (!file) {
      setError("설치 파일을 선택해 주세요.");
      return;
    }

    setPending(true);
    setError(null);
    setProgress(0);
    const payload = {
      ...values,
      appId,
      fileName: file.name,
      fileSize: file.size,
    };

    try {
      setStatus("업로드 주소를 만드는 중");
      const presign = await createReleaseUpload(payload);
      if (!presign.ok) {
        setError(presign.error);
        return;
      }

      setStatus("설치 파일을 업로드하는 중");
      await uploadToPresignedUrl(presign.data.uploadUrl, file, presign.data.contentType, setProgress);

      setStatus("릴리즈 정보를 저장하는 중");
      const saved = await finalizeRelease({ ...payload, objectKey: presign.data.objectKey });
      if (!saved.ok) {
        setError(saved.error);
        return;
      }

      toast.success("새 버전을 등록했습니다.");
      router.push(`/admin/apps/${appId}`);
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "업로드하지 못했습니다.");
    } finally {
      setPending(false);
      setStatus(null);
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FormField
          control={form.control}
          name="platform"
          render={({ field }) => (
            <FormItem>
              <FormLabel>플랫폼</FormLabel>
              <FormControl>
                <select
                  {...field}
                  className="flex h-11 w-full cursor-pointer rounded-lg border border-input bg-card px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {PLATFORMS.map((item) => (
                    <option key={item} value={item}>
                      {PLATFORM_LABEL[item]}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormDescription>
                허용 파일: {platformExtensionLabel(platform)}
                {currentMax ? ` · 현재 최대 버전 코드 ${currentMax}` : " · 이 플랫폼의 첫 릴리즈입니다."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="version_string"
          render={({ field }) => (
            <FormItem>
              <FormLabel>버전 문자열</FormLabel>
              <FormControl>
                <Input {...field} className="font-mono" placeholder="1.2.0" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="version_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>버전 코드</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={Number.isNaN(field.value) ? "" : field.value}
                  onChange={(event) => field.onChange(event.target.valueAsNumber)}
                />
              </FormControl>
              <FormDescription>
                이 플랫폼에서 이전보다 큰 정수여야 합니다. Android라면 versionCode를 그대로 쓰세요. 업데이트 API는 이 숫자로 최신 여부를 판단합니다.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="release_notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>릴리즈 노트</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="is_mandatory"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormControl>
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer accent-primary"
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormLabel>필수 업데이트</FormLabel>
              </div>
              <FormDescription>
                이 버전을 건너뛰는 이전 클라이언트도 업데이트가 강제로 표시됩니다.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <label htmlFor="installer-file" className="text-sm font-medium">
            설치 파일
          </label>
          <Input
            id="installer-file"
            type="file"
            accept={acceptForPlatform(platform)}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
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
          {pending ? "등록 중" : "버전 등록"}
        </Button>
      </form>
    </Form>
  );
}
