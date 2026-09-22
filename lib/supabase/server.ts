import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<ReturnType<typeof cookies>["set"]>[2];
};

/**
 * Server Component와 Server Action용 클라이언트.
 * 브라우저 클라이언트와 쿠키 처리가 달라서 파일을 나눈다.
 * Next.js 14의 cookies()는 동기 함수다.
 */
export function createClient() {
  const env = getPublicSupabaseEnv();
  if (!env) return null;

  const cookieStore = cookies();

  return createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component 렌더 중에는 쿠키를 쓸 수 없다.
          // 세션 갱신은 middleware가 담당한다.
        }
      },
    },
  });
}
