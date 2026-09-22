import { AppCard } from "@/components/store/app-card";
import { QueryError, SetupGuide } from "@/components/store/status-panel";
import { listCatalogApps } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const result = await listCatalogApps();

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <p className="text-sm font-medium text-primary">LDH App Store</p>
        <h1 className="text-4xl font-semibold tracking-tight">개인 앱 스토어</h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          직접 만든 앱의 최신 설치 파일을 확인하고 내려받습니다.
        </p>
      </section>

      {result.status === "unconfigured" ? <SetupGuide /> : null}
      {result.status === "error" ? <QueryError reason={result.reason} /> : null}
      {result.status === "ok" && result.data.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          등록된 앱이 없습니다. 관리 화면에서 첫 앱을 추가해 주세요.
        </p>
      ) : null}
      {result.status === "ok" && result.data.length > 0 ? (
        <section aria-label="앱 목록" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {result.data.map((app) => (
            <AppCard
              key={app.id}
              name={app.name}
              slug={app.slug}
              shortDescription={app.short_description}
              iconUrl={app.icon_url}
              platforms={app.platforms}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}
