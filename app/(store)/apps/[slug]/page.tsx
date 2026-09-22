import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Download, Package } from "lucide-react";
import { ScreenshotGallery } from "@/components/store/screenshot-gallery";
import { QueryError, SetupGuide } from "@/components/store/status-panel";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_LABEL } from "@/lib/files";
import { formatBytes, formatKoreanDate } from "@/lib/format";
import { getAppDetailBySlug } from "@/lib/queries";
import { latestReleaseByPlatform } from "@/lib/releases";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { slug: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const result = await getAppDetailBySlug(params.slug);
  if (result.status !== "ok" || !result.data) {
    return { title: "앱" };
  }
  return {
    title: result.data.name,
    description: result.data.short_description,
  };
}

export default async function AppDetailPage({ params }: PageProps) {
  const result = await getAppDetailBySlug(params.slug);
  if (result.status === "unconfigured") return <SetupGuide />;
  if (result.status === "error") return <QueryError reason={result.reason} />;
  if (!result.data) notFound();

  const app = result.data;
  const latest = latestReleaseByPlatform(app.releases);
  const history = [...app.releases].sort((left, right) => right.version_code - left.version_code);

  return (
    <article className="space-y-10">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {app.icon_url ? (
          <Image
            src={app.icon_url}
            alt=""
            width={96}
            height={96}
            className="h-24 w-24 rounded-3xl border border-border object-cover"
          />
        ) : (
          <span className="flex h-24 w-24 items-center justify-center rounded-3xl border border-border bg-muted">
            <Package className="h-8 w-8 text-muted-foreground" aria-hidden />
          </span>
        )}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{app.name}</h1>
          <p className="text-base text-muted-foreground">{app.short_description}</p>
          <p className="font-mono text-sm text-muted-foreground">{app.package_name}</p>
        </div>
      </header>

      {app.description ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">설명</h2>
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{app.description}</p>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">스크린샷</h2>
        <ScreenshotGallery
          appName={app.name}
          shots={app.screenshots.map((shot) => ({
            id: shot.id,
            imageUrl: shot.image_url,
            altText: shot.alt_text,
          }))}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">최신 버전 다운로드</h2>
        {latest.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 받은 파일이 없습니다.</p>
        ) : (
          <ul className="space-y-4">
            {latest.map((release) => (
              <li key={release.id} className="space-y-3 rounded-xl border border-border bg-card p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{PLATFORM_LABEL[release.platform]}</Badge>
                  <span className="font-mono text-sm">{release.version_string}</span>
                  {release.is_mandatory ? <Badge variant="required">필수 업데이트</Badge> : null}
                  <span className="text-sm text-muted-foreground">{formatKoreanDate(release.created_at)}</span>
                  {release.file_size_bytes != null ? (
                    <span className="text-sm text-muted-foreground">{formatBytes(release.file_size_bytes)}</span>
                  ) : null}
                </div>
                {release.release_notes ? (
                  <p className="whitespace-pre-wrap text-sm leading-6">{release.release_notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">릴리즈 노트가 없습니다.</p>
                )}
                <a
                  href={release.download_url}
                  className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Download className="h-5 w-5" aria-hidden />
                  {PLATFORM_LABEL[release.platform]} {release.version_string} 다운로드
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {history.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">릴리즈 기록</h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {history.map((release) => (
              <li key={release.id} className="space-y-1 px-4 py-3">
                <p className="text-sm">
                  <span className="font-medium">{PLATFORM_LABEL[release.platform]}</span>{" "}
                  <span className="font-mono">{release.version_string}</span>
                  <span className="text-muted-foreground"> · {formatKoreanDate(release.created_at)}</span>
                </p>
                {release.release_notes ? (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{release.release_notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
