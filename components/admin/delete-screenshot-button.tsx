"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteScreenshot } from "@/app/admin/actions/apps";
import { Button } from "@/components/ui/button";

export function DeleteScreenshotButton({ screenshotId }: { screenshotId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setPending(true);
    setError(null);
    const result = await deleteScreenshot(screenshotId);
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <Button variant="secondary" size="sm" onClick={onClick} disabled={pending}>
        {pending ? "삭제 중" : "삭제"}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
