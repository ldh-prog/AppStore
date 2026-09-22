# LDH App Store

개인 앱(APK, EXE, DMG 등)을 전시하고, 클라이언트 앱이 최신 버전을 확인하는 Next.js 14 스토어입니다.

## 구성

| 경로 | 역할 |
|------|------|
| `/` | 공개 앱 그리드 |
| `/apps/[slug]` | 설명, 스크린샷, 최신 다운로드 |
| `/admin/login` | Supabase Auth 로그인 |
| `/admin` | 앱 목록 |
| `/admin/apps/new` | 앱 등록 |
| `/admin/apps/[id]` | 메타데이터 수정 |
| `/admin/apps/[id]/releases/new` | 새 버전 업로드 |
| `GET /api/update-check` | 버전 체크 API |

설계 배경은 `docs/01-architecture.md`, 환경 설정은 `docs/02-setup.md`에 있습니다.

## 로컬 실행

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local`의 Supabase 값과 `supabase/schema.sql`을 적용하기 전에는 스토어가 설정 안내를 보여 줍니다.

## 확인

```bash
npm test
npm run lint
npm run build
```

## 버전 체크 예

```bash
curl "http://localhost:3000/api/update-check?package_name=kr.ulsan.ldh.myapp&current_version=1.0.0&platform=android"
```
