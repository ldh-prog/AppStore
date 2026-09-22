# Admin Page Overrides

> **PROJECT:** LDH App Store
> **Page Type:** Authenticated release desk
> 이 파일은 `MASTER.md`에서 어긋나는 규칙만 적는다.

## Layout

- **Max Width:** 목록 `max-w-7xl`, 등록·수정 폼 `max-w-3xl`
- **Density:** 표와 폼 라벨 간격은 스토어보다 촘촘하게 (`space-y-4`)
- **Theme:** 스토어와 같은 라이트 팔레트. 다크 배경과 그린 브랜드 CTA는 쓰지 않는다.

## Sections

1. 로그인
2. 앱 목록 표 (이름, 패키지명, 최신 버전, 수정 링크)
3. 앱 메타데이터 폼
4. 릴리즈 폼: 플랫폼, 버전, 릴리즈 노트, 필수 업데이트, 설치 파일

히어로, 스크린샷 마케팅 섹션, 다운로드 CTA 패턴은 관리자 화면에 쓰지 않는다.

## Forms

- shadcn `Form` + `react-hook-form` + `zod`
- 모든 필드에 보이는 라벨
- 제출 중 버튼 비활성 + 스피너, 완료 후 성공 또는 오류 메시지
- 파일 입력은 허용 확장자를 플랫폼과 맞춰 검사한다.
  - android: `.apk`
  - windows: `.exe`
  - macos: `.dmg`
  - linux: `.AppImage`, `.deb`

## Feedback

- 업로드 진행률은 브라우저가 R2로 직접 보낼 때 `xhr.upload.onprogress`로 표시한다.
- 성공 색 `#15803D`는 "저장됨" 상태에만 쓴다. 기본 저장 버튼은 CTA 블루다.
