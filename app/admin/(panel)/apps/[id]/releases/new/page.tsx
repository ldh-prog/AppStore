import { notFound } from "next/navigation";
import { ReleaseForm } from "@/components/admin/release-form";
import { QueryError } from "@/components/store/status-panel";
import type { Platform } from "@/lib/files";
import { getAdminApp } from "@/lib/queries";
import { latestReleaseByPlatform } from "@/lib/releases";

export const dynamic = "force-dynamic";

type PageProps = { params: { id: string } };

export default async function NewReleasePage({ params }: PageProps) {
  const result = await getAdminApp(params.id);
  if (result.status === "error") return <QueryError reason={result.reason} />;
  if (result.status !== "ok" || !result.data) notFound();

  const latestCodes: Partial<Record<Platform, number>> = {};
  latestReleaseByPlatform(result.data.releases).forEach((release) => {
    latestCodes[release.platform] = release.version_code;
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{result.data.name} 새 버전</h1>
        <p className="text-sm text-muted-foreground">
          설치 파일은 브라우저에서 R2로 바로 올라가고, 성공한 뒤에만 릴리즈 기록이 저장됩니다.
        </p>
      </div>
      <ReleaseForm appId={result.data.id} latestCodes={latestCodes} />
    </div>
  );
}
