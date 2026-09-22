import Link from "next/link";
import { notFound } from "next/navigation";
import { AppForm } from "@/components/admin/app-form";
import { DeleteAppButton } from "@/components/admin/delete-app-button";
import { QueryError } from "@/components/store/status-panel";
import { buttonVariants } from "@/components/ui/button";
import { PLATFORM_LABEL } from "@/lib/files";
import { formatKoreanDate } from "@/lib/format";
import { getAdminApp } from "@/lib/queries";

export const dynamic = "force-dynamic";

type PageProps = { params: { id: string } };

export default async function EditAppPage({ params }: PageProps) {
  const result = await getAdminApp(params.id);
  if (result.status === "error") return <QueryError reason={result.reason} />;
  if (result.status !== "ok" || !result.data) notFound();

  const app = result.data;
  const releases = [...app.releases].sort((left, right) => right.version_code - left.version_code);

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{app.name}</h1>
          <p className="text-sm text-muted-foreground">스토어에 보이는 정보와 이미지를 수정합니다.</p>
        </div>
        <Link href={`/admin/apps/${app.id}/releases/new`} className={buttonVariants()}>
          새 버전
        </Link>
      </div>

      <AppForm
        mode="edit"
        includeInstaller={releases.length === 0}
        app={{
          id: app.id,
          name: app.name,
          slug: app.slug,
          package_name: app.package_name,
          short_description: app.short_description,
          description: app.description,
          iconUrl: app.icon_url,
        }}
        screenshots={app.screenshots.map((shot) => ({
          id: shot.id,
          imageUrl: shot.image_url,
          altText: shot.alt_text,
        }))}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">릴리즈</h2>
        {releases.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 버전이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {releases.map((release) => (
              <li key={release.id} className="px-4 py-3 text-sm">
                <span className="font-medium">{PLATFORM_LABEL[release.platform]}</span>{" "}
                <span className="font-mono">{release.version_string}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · 코드 {release.version_code} · {formatKoreanDate(release.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-muted-foreground">
          올린 릴리즈는 지우지 않습니다. 클라이언트 앱이 현재 버전 문자열로 조회하려면 그 기록이 남아 있어야 합니다.
        </p>
      </section>

      <DeleteAppButton appId={app.id} appName={app.name} />
    </div>
  );
}
