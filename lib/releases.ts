import type { Platform } from "@/lib/files";

/**
 * 플랫폼별 최신 릴리즈만 남긴다.
 * 공개 상세와 관리자 표가 같은 규칙을 쓰도록 쿼리 바깥에 둔다.
 */
export function latestReleaseByPlatform<T extends { platform: Platform; version_code: number }>(
  releases: T[],
): T[] {
  const latest = new Map<Platform, T>();
  releases.forEach((release) => {
    const current = latest.get(release.platform);
    if (!current || release.version_code > current.version_code) {
      latest.set(release.platform, release);
    }
  });
  return [...latest.values()];
}
