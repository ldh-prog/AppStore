export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

type DbErrorLike = {
  code?: string;
  message?: string;
};

export function mapDbError(error: DbErrorLike): string {
  const message = error.message ?? "";
  if (error.code === "23505" || message.includes("duplicate key")) {
    if (message.includes("package_name")) return "이미 등록된 패키지 이름입니다.";
    if (message.includes("slug")) return "이미 사용 중인 주소입니다.";
    if (message.includes("version_string")) return "같은 플랫폼에 같은 버전 문자열이 있습니다.";
    if (message.includes("version_code")) return "같은 플랫폼에 같은 버전 코드가 있습니다.";
    return "이미 존재하는 값입니다.";
  }
  if (error.code === "23514" || message.includes("version_code")) {
    return "버전 코드는 이 플랫폼의 기존 최댓값보다 커야 합니다.";
  }
  return "저장하지 못했습니다. 입력값과 스키마 적용 여부를 확인해 주세요.";
}

export function firstIssueMessage(issues: { message: string }[]): string {
  return issues[0]?.message ?? "입력값을 확인해 주세요.";
}
