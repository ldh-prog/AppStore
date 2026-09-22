# Store Page Overrides

> **PROJECT:** LDH App Store
> **Page Type:** Public catalog + app detail
> 이 파일은 `MASTER.md`에서 어긋나는 규칙만 적는다.

## Layout

- **Max Width:** `max-w-6xl`
- **Grid:** 모바일 1열, `sm` 2열, `lg` 3열. 카드 간격 `gap-6`
- **Header:** 상단에서 `top-4`만큼 띄운 플로팅 헤더. 본문 `padding-top`은 헤더 높이 + 16px

## Sections

1. 히어로: 스토어 이름, 한 줄 설명. 디바이스 목업은 실제 스크린샷이 있을 때만 상세 페이지에서 보여 준다.
2. 앱 그리드: 아이콘, 이름, `short_description`
3. 상세: 설명, 스크린샷 캐러셀, 플랫폼별 최신 릴리즈, 릴리즈 노트, 다운로드 버튼

평점, 리뷰, QR, 스토어 배지는 이 제품 범위 밖이다.

## Components

- 앱 카드 호버: 테두리 색만 `#2563EB`로 전환. scale 금지.
- 다운로드 버튼은 상세 상단과 릴리즈 블록에 둔다. 클릭 시 R2 public URL로 이동한다.
- 플랫폼은 텍스트 배지(`Android`, `Windows`, `macOS`, `Linux`)로 구분한다. 색만으로 구분하지 않는다.
- 스크린샷이 없으면 빈 캐러셀 대신 "스크린샷 없음" 문구를 보여 준다.
- 목록 로딩은 카드 스켈레톤 6개.

## Stack notes

- 원격 이미지는 `next/image` + `remotePatterns`
- 카드 링크는 `<Link>`로 감싸 키보드 탐색이 되게 한다.
