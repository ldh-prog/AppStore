import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-start justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">페이지를 찾을 수 없습니다</h1>
      <p className="text-sm text-muted-foreground">주소가 바뀌었거나 아직 등록되지 않은 앱입니다.</p>
      <Link
        href="/"
        className="inline-flex h-11 cursor-pointer items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
      >
        스토어로 돌아가기
      </Link>
    </div>
  );
}
