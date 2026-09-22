import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ServerSupabase = NonNullable<ReturnType<typeof createClient>>;

export type AdminContext =
  | { status: "unconfigured" }
  | { status: "anonymous" }
  | { status: "forbidden"; email: string }
  | { status: "ok"; email: string; supabase: ServerSupabase };

export async function getAdminContext(): Promise<AdminContext> {
  const supabase = createClient();
  if (!supabase) return { status: "unconfigured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { status: "anonymous" };

  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return { status: "forbidden", email: user.email ?? "알 수 없는 계정" };
  }

  return { status: "ok", email: user.email ?? "관리자", supabase };
}

export async function requireAdmin(): Promise<
  | { ok: true; supabase: ServerSupabase }
  | { ok: false; error: string }
> {
  const context = await getAdminContext();
  if (context.status === "unconfigured") {
    return { ok: false, error: "Supabase 환경 변수가 없습니다." };
  }
  if (context.status === "anonymous") {
    return { ok: false, error: "로그인이 필요합니다." };
  }
  if (context.status === "forbidden") {
    return { ok: false, error: "관리자 권한이 없습니다. admin_users 허용 목록을 확인해 주세요." };
  }
  return { ok: true, supabase: context.supabase };
}
