/**
 * 브라우저에 노출돼도 되는 값만 읽는다.
 * R2 비밀키는 lib/r2.ts 에만 둔다.
 */
export function hasPublicSupabaseEnv(): boolean {
  return getPublicSupabaseEnv() !== null;
}

export function getPublicSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  // .env.local 템플릿 값이 그대로면 없는 것과 같이 취급해 잘못된 호스트로 요청하지 않는다.
  if (url.includes("YOUR_PROJECT_REF") || anonKey === "your-anon-key") return null;
  return { url, anonKey };
}
