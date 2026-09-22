import Link from "next/link";
import { Download, LayoutDashboard } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="fixed left-4 right-4 top-4 z-50">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-xl border border-border bg-white/80 px-4 backdrop-blur">
        <Link href="/" className="cursor-pointer text-sm font-semibold tracking-tight">
          LDH App Store
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-foreground transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Download className="h-4 w-4" aria-hidden />
            스토어
          </Link>
          <Link
            href="/admin"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-foreground transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden />
            관리
          </Link>
        </nav>
      </div>
    </header>
  );
}
