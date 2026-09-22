import { describe, expect, it } from "vitest";
import { evaluateUpdateCheck, type ReleaseSnapshot } from "@/lib/versions";
import { updateCheckQuerySchema } from "@/lib/validations";
import { buildReleaseObjectKey, isIconObjectKey, isReleaseObjectKey } from "@/lib/object-keys";
import { installerContentType, sanitizeFileName } from "@/lib/files";
import { latestReleaseByPlatform } from "@/lib/releases";
import { safeAdminPath, suggestSlug } from "@/lib/format";

const base: ReleaseSnapshot = {
  version_string: "1.0.0",
  version_code: 10,
  download_url: "https://pub.example/app.apk",
  release_notes: "첫 버전",
  is_mandatory: false,
};

describe("evaluateUpdateCheck", () => {
  it("더 큰 version_code가 있으면 업데이트를 알린다", () => {
    const result = evaluateUpdateCheck(
      [
        base,
        {
          ...base,
          version_string: "1.10.0",
          version_code: 110,
          release_notes: "버그 수정 및 UI 개선",
          download_url: "https://pub.example/app-v1.10.0.apk",
        },
      ],
      "1.0.0",
    );

    expect(result).toEqual({
      ok: true,
      body: {
        update_available: true,
        latest_version: "1.10.0",
        is_mandatory: false,
        download_url: "https://pub.example/app-v1.10.0.apk",
        release_notes: "버그 수정 및 UI 개선",
      },
    });
  });

  it("문자열 순서가 아니라 version_code가 큰 릴리즈를 최신으로 본다", () => {
    const result = evaluateUpdateCheck(
      [
        { ...base, version_string: "1.9.0", version_code: 90 },
        { ...base, version_string: "1.10.0", version_code: 100 },
      ],
      "1.9.0",
    );
    expect(result.ok && result.body.latest_version).toBe("1.10.0");
  });

  it("같은 버전이면 업데이트가 없다", () => {
    const result = evaluateUpdateCheck([base], "1.0.0");
    expect(result.ok && result.body.update_available).toBe(false);
  });

  it("중간 릴리즈가 필수이면 최신 릴리즈가 필수가 아니어도 강제로 표시한다", () => {
    const result = evaluateUpdateCheck(
      [
        base,
        { ...base, version_string: "1.1.0", version_code: 11, is_mandatory: true },
        { ...base, version_string: "1.2.0", version_code: 12, is_mandatory: false, release_notes: "개선" },
      ],
      "1.0.0",
    );
    expect(result.ok && result.body.is_mandatory).toBe(true);
    expect(result.ok && result.body.latest_version).toBe("1.2.0");
  });

  it("등록되지 않은 현재 버전은 거절한다", () => {
    const result = evaluateUpdateCheck([base], "9.9.9");
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it("릴리즈가 없으면 404다", () => {
    const result = evaluateUpdateCheck([], "1.0.0");
    expect(result).toMatchObject({ ok: false, status: 404 });
  });
});

describe("updateCheckQuerySchema", () => {
  it("app_id와 package_name이 모두 없으면 거절한다", () => {
    const result = updateCheckQuerySchema.safeParse({
      current_version: "1.0.0",
      platform: "android",
    });
    expect(result.success).toBe(false);
  });

  it("package_name만으로 통과한다", () => {
    const result = updateCheckQuerySchema.safeParse({
      package_name: "kr.ulsan.ldh.ledger",
      current_version: "1.2.0",
      platform: "windows",
    });
    expect(result.success).toBe(true);
  });
});

describe("object keys", () => {
  const appId = "11111111-1111-4111-8111-111111111111";

  it("릴리즈 키는 경로 탐색 문자를 파일명에서 제거한다", () => {
    const key = buildReleaseObjectKey({
      appId,
      platform: "android",
      versionCode: 12,
      fileName: "../secret/../../app v1.apk",
    });
    expect(key).toBe(`apps/${appId}/releases/android/12/app_v1.apk`);
    expect(isReleaseObjectKey(appId, key, key)).toBe(true);
    expect(isReleaseObjectKey(appId, `apps/${appId}/releases/android/12/other.apk`, key)).toBe(false);
  });

  it("아이콘 키 형식을 검사한다", () => {
    expect(isIconObjectKey(appId, `apps/${appId}/icon/${appId}.png`)).toBe(true);
    expect(isIconObjectKey(appId, `apps/${appId}/icon/not-a-uuid.png`)).toBe(false);
  });
});

describe("files and paths", () => {
  it("플랫폼과 확장자가 맞을 때만 content type을 준다", () => {
    expect(installerContentType("android", "app.apk")).toBe("application/vnd.android.package-archive");
    expect(installerContentType("android", "app.exe")).toBeNull();
    expect(installerContentType("linux", "Tool.AppImage")).toBe("application/octet-stream");
  });

  it("파일명에서 경로를 제거한다", () => {
    expect(sanitizeFileName("C:\\downloads\\My App.dmg")).toBe("My_App.dmg");
  });

  it("관리자 이동 경로는 /admin 아래만 허용한다", () => {
    expect(safeAdminPath("/admin/apps/new")).toBe("/admin/apps/new");
    expect(safeAdminPath("https://evil.example")).toBe("/admin");
    expect(safeAdminPath("//evil.example")).toBe("/admin");
  });

  it("한글 이름에서는 빈 슬러그를 만들고 영문은 하이픈으로 잇는다", () => {
    expect(suggestSlug("가계부")).toBe("");
    expect(suggestSlug("Household Ledger")).toBe("household-ledger");
  });

  it("플랫폼별 최신 코드만 남긴다", () => {
    const latest = latestReleaseByPlatform([
      { platform: "android" as const, version_code: 1 },
      { platform: "android" as const, version_code: 3 },
      { platform: "windows" as const, version_code: 2 },
    ]);
    expect(latest).toEqual([
      { platform: "android", version_code: 3 },
      { platform: "windows", version_code: 2 },
    ]);
  });
});
