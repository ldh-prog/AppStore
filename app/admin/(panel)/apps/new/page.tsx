import { AppForm } from "@/components/admin/app-form";

export const dynamic = "force-dynamic";

export default function NewAppPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">앱 등록</h1>
        <p className="text-sm text-muted-foreground">
          이름, 패키지 이름, 첫 설치 파일을 함께 등록합니다. 다음 버전은 앱 수정 화면의 새 버전에서 올립니다.
        </p>
      </div>
      <AppForm mode="create" />
    </div>
  );
}
