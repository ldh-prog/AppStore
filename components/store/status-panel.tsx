import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SetupGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>연결 정보가 필요합니다</CardTitle>
        <CardDescription>
          Supabase URL과 anon 키를 넣어야 앱 목록을 읽을 수 있습니다. 비밀키는 이 화면에 표시하지 않습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>1. `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 채웁니다.</p>
        <p>2. Supabase SQL Editor에서 `supabase/schema.sql`을 실행합니다.</p>
        <p>3. 개발 서버를 다시 시작합니다. R2 값은 설치 파일을 올릴 때 필요합니다.</p>
      </CardContent>
    </Card>
  );
}

export function QueryError({ reason }: { reason: "schema" | "unavailable" }) {
  const message =
    reason === "schema"
      ? "테이블을 찾지 못했습니다. supabase/schema.sql을 실행했는지 확인해 주세요."
      : "목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertCircle className="h-5 w-5 text-destructive" aria-hidden />
          데이터를 읽지 못했습니다
        </CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
    </Card>
  );
}
