import Link from "next/link";
import { signOut } from "@/app/admin/actions/auth";

export function AdminHeader({ email }: { email: string }) {
  return (
    <header className="fixed left-4 right-4 top-4 z-50">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 rounded-xl border border-border bg-white/80 px-4 backdrop-blur">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="cursor-pointer text-sm font-semibold">
            관리
          </Link>
          <Link
            href="/"
            className="cursor-pointer text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            스토어 보기
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden text-sm text-muted-foreground sm:block">{email}</p>
          <form action={signOut}>
            <button
              type="submit"
              className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
