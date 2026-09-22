import { AppForm } from "@/components/admin/app-form";

export const dynamic = "force-dynamic";

export default function NewAppPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">앱 등록</h1>
        <p className="text-sm text-muted-foreground">이름과 패키지 이름을 저장한 뒤 아이콘과 스크린샷을 올립니다.</p>
      </div>
      <AppForm mode="create" />
    </div>
  );
}
