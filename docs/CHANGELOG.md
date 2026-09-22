# Changelog

## 0.1.1

- 앱 등록 폼에 첫 설치 파일, 플랫폼, 버전 입력을 넣었다. 파일이 없는 앱의 수정 화면에도 같은 입력을 둔다.

## 0.1.0

- 공개 앱 그리드와 상세 페이지, 플랫폼별 최신 다운로드를 추가했다.
- Supabase Auth와 `admin_users`로 보호되는 관리자 화면에서 앱 정보와 새 버전을 등록한다.
- 설치 파일은 Server Action이 발급한 R2 presigned URL로 브라우저가 직접 업로드한다.
- `GET /api/update-check`가 `version_code`로 업데이트 여부와 필수 여부를 반환한다.
