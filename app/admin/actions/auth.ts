"use server";

import { redirect } from "next/navigation";
import { firstIssueMessage } from "@/lib/db-error";
import type { ActionResult } from "@/lib/db-error";
import { safeAdminPath } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { signInSchema } from "@/lib/validations";

export async function signIn(input: unknown): Promise<ActionResult<null>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error.issues) };
  }

  const supabase = createClient();
  if (!supabase) {
    return { ok: false, error: "Supabase 환경 변수가 없습니다." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  redirect(safeAdminPath(parsed.data.next));
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
