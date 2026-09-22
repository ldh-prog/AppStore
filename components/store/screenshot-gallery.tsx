"use client";

import Image from "next/image";
import { useRef } from "react";
import { Button } from "@/components/ui/button";

type Shot = {
  id: string;
  imageUrl: string;
  altText: string;
};

export function ScreenshotGallery({ shots, appName }: { shots: Shot[]; appName: string }) {
  const scroller = useRef<HTMLDivElement>(null);

  if (shots.length === 0) {
    return <p className="text-sm text-muted-foreground">등록된 스크린샷이 없습니다.</p>;
  }

  function scrollByCard(direction: -1 | 1) {
    scroller.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  }

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => scrollByCard(-1)}>
          이전
        </Button>
        <Button variant="secondary" size="sm" onClick={() => scrollByCard(1)}>
          다음
        </Button>
      </div>
      <div ref={scroller} className="flex gap-4 overflow-x-auto pb-2">
        {shots.map((shot, index) => (
          <div
            key={shot.id}
            className="relative h-64 w-80 shrink-0 overflow-hidden rounded-xl border border-border bg-muted"
          >
            <Image
              src={shot.imageUrl}
              alt={shot.altText || `${appName} 스크린샷 ${index + 1}`}
              fill
              className="object-contain"
              sizes="320px"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
