import { LoginForm } from "@/components/admin/login-form";
import { SetupGuide } from "@/components/store/status-panel";
import { hasPublicSupabaseEnv } from "@/lib/env";
import { safeAdminPath } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "로그인",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: { next?: string };
};

export default function LoginPage({ searchParams }: PageProps) {
  if (!hasPublicSupabaseEnv()) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16">
        <SetupGuide />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-16">
      <LoginForm nextPath={safeAdminPath(searchParams.next)} />
    </main>
  );
}
