import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlatform } from "@/lib/files";
import { evaluateUpdateCheck, type ReleaseSnapshot } from "@/lib/versions";
import { updateCheckQuerySchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
};

/**
 * 클라이언트 앱이 자기 버전보다 새로운 릴리즈가 있는지 확인한다.
 * 비교 기준은 version_code다. 문자열 비교는 1.10.0과 1.9.0을 뒤집는다.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = updateCheckQuerySchema.safeParse({
    app_id: readParam(url, "app_id"),
    package_name: readParam(url, "package_name"),
    current_version: readParam(url, "current_version"),
    platform: readParam(url, "platform"),
  });

  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? "쿼리 파라미터를 확인해 주세요." }, 400);
  }

  const supabase = createClient();
  if (!supabase) {
    return json({ error: "서버에 Supabase 환경 변수가 없습니다." }, 503);
  }

  let appId = parsed.data.app_id;
  if (appId) {
    const { data: app, error } = await supabase
      .from("apps")
      .select("id, package_name")
      .eq("id", appId)
      .maybeSingle();
    if (error) {
      console.error("update-check app", error.message);
      return json({ error: "앱 정보를 읽지 못했습니다." }, 500);
    }
    if (!app) return json({ error: "앱을 찾을 수 없습니다." }, 404);
    if (parsed.data.package_name && app.package_name !== parsed.data.package_name) {
      return json({ error: "app_id와 package_name이 서로 다른 앱을 가리킵니다." }, 400);
    }
  } else if (parsed.data.package_name) {
    const { data: app, error } = await supabase
      .from("apps")
      .select("id")
      .eq("package_name", parsed.data.package_name)
      .maybeSingle();
    if (error) {
      console.error("update-check package", error.message);
      return json({ error: "앱 정보를 읽지 못했습니다." }, 500);
    }
    if (!app) return json({ error: "앱을 찾을 수 없습니다." }, 404);
    appId = app.id;
  }

  if (!appId) {
    return json({ error: "app_id 또는 package_name이 필요합니다." }, 400);
  }

  const { data, error } = await supabase
    .from("releases")
    .select("version_string, version_code, download_url, release_notes, is_mandatory, platform")
    .eq("app_id", appId)
    .eq("platform", parsed.data.platform);

  if (error) {
    console.error("update-check releases", error.message);
    return json({ error: "릴리즈 정보를 읽지 못했습니다." }, 500);
  }

  const releases: ReleaseSnapshot[] = (data ?? []).flatMap((row) => {
    if (!isPlatform(row.platform)) return [];
    return [
      {
        version_string: row.version_string,
        version_code: row.version_code,
        download_url: row.download_url,
        release_notes: row.release_notes,
        is_mandatory: row.is_mandatory,
      },
    ];
  });

  const evaluation = evaluateUpdateCheck(releases, parsed.data.current_version);
  if (!evaluation.ok) return json({ error: evaluation.error }, evaluation.status);
  return json(evaluation.body, 200);
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS });
}

function readParam(url: URL, key: string): string | undefined {
  const value = url.searchParams.get(key)?.trim();
  return value ? value : undefined;
}

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}
