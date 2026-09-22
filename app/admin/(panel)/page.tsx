import Link from "next/link";
import { Plus } from "lucide-react";
import { QueryError } from "@/components/store/status-panel";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PLATFORM_LABEL } from "@/lib/files";
import { listAdminApps } from "@/lib/queries";
import { latestReleaseByPlatform } from "@/lib/releases";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const result = await listAdminApps();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">앱</h1>
          <p className="text-sm text-muted-foreground">메타데이터를 고치고 새 설치 파일을 올립니다.</p>
        </div>
        <Link href="/admin/apps/new" className={buttonVariants()}>
          <Plus className="h-4 w-4" aria-hidden />
          앱 등록
        </Link>
      </div>

      {result.status === "error" ? <QueryError reason={result.reason} /> : null}
      {result.status === "ok" && result.data.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          등록된 앱이 없습니다.
        </p>
      ) : null}
      {result.status === "ok" && result.data.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">앱</th>
                <th className="px-4 py-3 font-medium">패키지 이름</th>
                <th className="px-4 py-3 font-medium">최신 버전</th>
                <th className="px-4 py-3 font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((app) => {
                const latest = latestReleaseByPlatform(app.releases);
                return (
                  <tr key={app.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{app.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{app.package_name}</td>
                    <td className="px-4 py-3">
                      {latest.length === 0 ? (
                        <span className="text-muted-foreground">릴리즈 없음</span>
                      ) : (
                        <span className="flex flex-wrap gap-2">
                          {latest.map((release) => (
                            <Badge key={release.platform}>
                              {PLATFORM_LABEL[release.platform]} {release.version_string}
                            </Badge>
                          ))}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <Link href={`/admin/apps/${app.id}`} className="cursor-pointer text-primary hover:underline">
                          수정
                        </Link>
                        <Link
                          href={`/admin/apps/${app.id}/releases/new`}
                          className="cursor-pointer text-primary hover:underline"
                        >
                          새 버전
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
