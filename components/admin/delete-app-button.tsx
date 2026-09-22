"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteApp } from "@/app/admin/actions/apps";
import { Button } from "@/components/ui/button";

export function DeleteAppButton({ appId, appName }: { appId: string; appName: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setPending(true);
    setError(null);
    const result = await deleteApp(appId);
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      setArmed(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button variant="destructive" onClick={onClick} disabled={pending}>
        {pending ? "삭제 중" : armed ? `${appName} 삭제 확정` : "앱 삭제"}
      </Button>
      <p className="text-sm text-muted-foreground">
        앱과 스토리지의 설치 파일, 스크린샷을 함께 지웁니다. 한 번 더 누르면 실행됩니다.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
