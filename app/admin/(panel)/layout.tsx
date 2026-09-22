import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
import { SetupGuide } from "@/components/store/status-panel";
import { getAdminContext } from "@/lib/auth";
import { signOut } from "@/app/admin/actions/auth";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
  title: "관리",
};

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const context = await getAdminContext();

  if (context.status === "unconfigured") {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16">
        <SetupGuide />
      </main>
    );
  }

  if (context.status === "anonymous") {
    redirect("/admin/login");
  }

  if (context.status === "forbidden") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-4 px-4">
        <h1 className="text-2xl font-semibold">관리자 권한이 없습니다</h1>
        <p className="text-sm text-muted-foreground">
          {context.email} 계정은 로그인되어 있지만 admin_users 허용 목록에 없습니다. Supabase SQL Editor에서 이 사용자의
          id를 넣은 뒤 다시 로그인하세요.
        </p>
        <form action={signOut}>
          <Button type="submit" variant="secondary">
            로그아웃
          </Button>
        </form>
      </main>
    );
  }

  return (
    <>
      <AdminHeader email={context.email} />
      <main id="main" className="mx-auto w-full max-w-7xl px-4 pb-16 pt-24">
        {children}
      </main>
    </>
  );
}
