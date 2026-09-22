# Design System Master File

> **LOGIC:** 페이지를 만들 때는 `design-system/ldh-app-store/pages/[page-name].md`를 먼저 본다.
> 페이지 파일이 있으면 그 규칙이 이 파일을 덮어쓴다.
> 없으면 아래 규칙을 따른다.

---

**Project:** LDH App Store
**Updated:** 2026-09-22
**Category:** Personal software catalog + admin

## 채택 이유

ui-ux-pro-max 검색 결과를 제품에 맞게 고른 기준이다.

| 검색 결과 | 채택 |
|-----------|------|
| 패턴: App Store Style Landing | 공개 스토어의 정보 구조로 사용. 평점·리뷰·QR은 요구사항에 없으므로 넣지 않는다. |
| 스타일: Flat Design | 전역 스타일. 그림자와 그라데이션을 최소화한다. |
| 색: Monochrome + blue `#2563EB` | 전역 브랜드 색. 신뢰감 있는 다운로드 CTA에 맞다. |
| 관리자 검색의 다크 배경 + 그린 CTA | 브랜드 색과 충돌하므로 채택하지 않는다. 성공 상태에만 그린을 쓴다. |
| 서체 Caveat / Fira Code 제목 | 카탈로그와 버전 번호 가독성에 맞지 않는다. |
| 서체 Korean Modern (Noto Sans KR) | UI 전역 서체. 한국어 릴리즈 노트를 본문으로 쓴다. |
| 서체 Fira Code | `version_string`, `package_name` 같은 식별자에만 사용한다. |

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable | 용도 |
|------|-----|--------------|------|
| Primary | `#18181B` | `--color-primary` | 제목, 주요 버튼 외곽, 아이콘 |
| Secondary | `#3F3F46` | `--color-secondary` | 보조 텍스트 경계, 배지 배경 |
| CTA/Accent | `#2563EB` | `--color-cta` | 다운로드, 저장, 로그인 |
| Background | `#FAFAFA` | `--color-background` | 페이지 배경 |
| Surface | `#FFFFFF` | `--color-surface` | 카드, 입력, 다이얼로그 |
| Text | `#09090B` | `--color-text` | 본문 |
| Muted | `#475569` | `--color-muted` | 부가 설명. 이보다 옅은 회색은 본문에 쓰지 않는다. |
| Border | `#E4E4E7` | `--color-border` | 카드·입력 경계 |
| Success | `#15803D` | `--color-success` | 업로드 완료, 최신 버전 배지 |
| Danger | `#B91C1C` | `--color-danger` | 필수 업데이트, 삭제, 오류 |

### Typography

- **UI Font:** Noto Sans KR
- **Mono:** Fira Code (`version_string`, `package_name`, 파일명)
- **Google Fonts:** [Noto Sans KR + Fira Code](https://fonts.google.com/share?selection.family=Fira+Code:wght@400;500;600|Noto+Sans+KR:wght@400;500;600;700)

```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Noto+Sans+KR:wght@400;500;600;700&display=swap');
```

`font-display: swap`을 유지하고, 폴백은 `system-ui`로 두어 글꼴 로딩 중 레이아웃이 크게 흔들리지 않게 한다.

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` | 배지 내부 |
| `--space-sm` | `8px` | 아이콘과 라벨 |
| `--space-md` | `16px` | 카드 패딩, 폼 간격 |
| `--space-lg` | `24px` | 섹션 내부 |
| `--space-xl` | `32px` | 섹션 사이 |
| `--space-2xl` | `48px` | 페이지 상단 |
| `--space-3xl` | `64px` | 히어로 |

컨테이너는 `max-w-6xl`로 통일한다. 관리자 표가 넓어야 하면 페이지만 `max-w-7xl`로 올린다.

### Elevation

플랫 디자인이 기본이다. 카드 구분은 그림자가 아니라 `border`와 surface 색으로 한다. 모달만 `--shadow-lg`를 허용한다.

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | 사용하지 않음. 문서화만 유지 |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | 모달 |

### Interaction

- 클릭 가능한 카드·버튼·링크는 `cursor-pointer`
- 호버는 색, 테두리, 투명도만 바꾼다. `scale`, `translateY`로 레이아웃을 밀지 않는다.
- 전환은 `transition-colors duration-200`
- 포커스 링은 `ring-2 ring-offset-2`로 항상 보이게 한다.
- `prefers-reduced-motion: reduce`이면 전환 시간을 0에 가깝게 줄인다.
- 아이콘은 Lucide만 사용한다. 이모지를 아이콘으로 쓰지 않는다.
- 300ms를 넘는 비동기 작업은 스켈레톤 또는 버튼 스피너를 보여 준다.
- 제출 중에는 버튼을 비활성화해 중복 전송을 막는다.

---

## Component Specs

### Buttons

Primary는 CTA 블루, 글자는 흰색이다. 보조 버튼은 surface 배경에 zinc 테두리다. 파괴 동작(삭제)만 danger 색을 쓴다.

### Cards

앱 카드는 아이콘, 이름, 한 줄 설명, 플랫폼 배지를 담는다. 카드 전체가 상세 페이지 링크다. 호버 시 테두리를 `#2563EB`로 바꾼다.

### Inputs

모든 입력에는 보이는 `<label>`이 있다. placeholder만으로 이름을 대신하지 않는다. 오류 메시지는 입력 아래, 색과 텍스트를 함께 쓴다.

### Images

앱 아이콘과 스크린샷은 `next/image`를 쓴다. R2 호스트는 `images.remotePatterns`에 명시한다. 아이콘은 64×64 논리 크기, 스크린샷은 고정 비율 프레임 안에서 `object-contain`으로 보여 잘림을 줄인다.

---

## Anti-Patterns

- 장식용 그라데이션, 퍼플/핑크 AI 룩
- 평점·리뷰·QR처럼 데이터 모델에 없는 소셜 프루프
- 이모지 아이콘
- 호버 시 레이아웃 이동
- 본문에 `#94A3B8` 이하 대비
- 라벨 없는 입력
- 제출 후 피드백 없는 폼
- 고정 네비게이션 뒤에 본문이 가려지는 레이아웃

## Pre-Delivery Checklist

- [ ] 아이콘은 Lucide SVG
- [ ] 클릭 요소에 `cursor-pointer`
- [ ] 호버는 150–300ms 색 전환, 레이아웃 이동 없음
- [ ] 본문 대비 4.5:1 이상 (`#09090B` / `#475569`)
- [ ] 키보드 포커스 링이 보임
- [ ] `prefers-reduced-motion` 존중
- [ ] 375 / 768 / 1024 / 1440px에서 가로 스크롤 없음
- [ ] 고정 헤더 높이만큼 본문 상단 여백
- [ ] 이미지 `alt`, 폼 라벨 존재
