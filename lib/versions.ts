export type ReleaseSnapshot = {
  version_string: string;
  version_code: number;
  download_url: string;
  release_notes: string;
  is_mandatory: boolean;
};

export type UpdateCheckBody = {
  update_available: boolean;
  latest_version: string;
  is_mandatory: boolean;
  download_url: string;
  release_notes: string;
};

export type UpdateCheckEvaluation =
  | { ok: true; body: UpdateCheckBody }
  | { ok: false; status: 400 | 404; error: string };

/**
 * 최신 여부는 version_code로만 판단한다.
 * 버전 문자열을 사전순으로 비교하면 1.10.0이 1.9.0보다 작다고 나온다.
 * 최신 릴리즈 자체에 필수 표시가 없어도, 그 사이 릴리즈가 필수이면 업데이트는 필수다.
 * 중간 버전을 건너뛰는 클라이언트가 강제 업데이트를 피하지 못하게 하기 위해서다.
 */
export function evaluateUpdateCheck(
  releases: ReleaseSnapshot[],
  currentVersion: string,
): UpdateCheckEvaluation {
  if (releases.length === 0) {
    return { ok: false, status: 404, error: "이 플랫폼의 릴리즈가 없습니다." };
  }

  const latest = releases.reduce((current, candidate) =>
    candidate.version_code > current.version_code ? candidate : current,
  );
  const current = releases.find((release) => release.version_string === currentVersion);

  if (!current) {
    return {
      ok: false,
      status: 400,
      error: "등록되지 않은 현재 버전입니다. 이 스토어에 올린 version_string을 보내 주세요.",
    };
  }

  const newer = releases.filter((release) => release.version_code > current.version_code);

  return {
    ok: true,
    body: {
      update_available: newer.length > 0,
      latest_version: latest.version_string,
      is_mandatory: newer.some((release) => release.is_mandatory),
      download_url: latest.download_url,
      release_notes: latest.release_notes,
    },
  };
}
