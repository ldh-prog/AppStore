# 01. 디렉토리 구조와 데이터 설계

- **목적:** 개인 앱 설치 파일을 전시·다운로드하고, 클라이언트 앱이 최신 버전을 조회하게 한다.
- **범위:** Next.js 14 App Router, Supabase Auth/Postgres, Cloudflare R2, Vercel.
- **구현:** 디렉토리와 SQL은 이 문서, 환경 변수와 실행 방법은 `docs/02-setup.md`를 본다.

## 디렉토리

```text
app/
  layout.tsx                      # 전역 폰트, 헤더 슬롯
  page.tsx                        # 공개 앱 그리드
  apps/[slug]/page.tsx            # 상세, 스크린샷, 최신 다운로드
  admin/
    login/page.tsx
    page.tsx                      # 앱 목록
    apps/new/page.tsx
    apps/[id]/page.tsx            # 메타데이터 수정
    apps/[id]/releases/new/page.tsx
  api/update-check/route.ts       # GET 버전 체크
components/
  ui/                             # shadcn
  store/                          # 카드, 갤러리, 다운로드
  admin/                          # 앱 폼, 릴리즈 폼
lib/
  supabase/client.ts              # 브라우저
  supabase/server.ts              # Server Component, Server Action
  supabase/middleware.ts
  r2.ts                           # S3 호환 클라이언트, presigned PUT
  versions.ts                     # version_string 형식 검사
  validations.ts                  # zod 스키마
types/database.ts
middleware.ts                     # /admin 세션 검사. /admin/login은 제외
supabase/schema.sql
design-system/ldh-app-store/
```

`lib/supabase.ts` 한 파일로 합치지 않는 이유: App Router에서는 브라우저 클라이언트와 쿠키 기반 서버 클라이언트의 생성 방식이 다르다. 한 파일에 두면 서버 전용 모듈이 클라이언트 번들에 섞인다.

## 요청 흐름

### 공개 스토어

1. 서버 컴포넌트가 `apps`와 플랫폼별 최신 `releases`를 읽는다.
2. 카드는 `/apps/[slug]`로 이동한다.
3. 다운로드 버튼은 `releases.download_url`(R2 public URL)로 연결한다. 파일 바이트는 Next.js를 거치지 않는다.

### 관리자

1. `middleware.ts`가 Supabase 세션을 확인한다.
2. Server Action이 `is_admin()`에 해당하는 사용자 세션으로 DB에 쓴다. 서비스 롤 키로 RLS를 우회하지 않는다.
3. 설치 파일은 아래 업로드 절차를 따른다.

### 버전 체크

`GET /api/update-check?app_id=&package_name=&current_version=&platform=`

- `app_id`와 `package_name` 중 하나는 필수다.
- `platform`은 `android | windows | macos | linux`.
- `current_version`은 `version_string`(예: `1.2.0`)이다.
- 서버는 해당 앱·플랫폼에서 `version_code`가 가장 큰 행을 최신으로 본다.
- 최신 `version_code`가 현재 릴리즈의 `version_code`보다 크면 `update_available: true`.
- 클라이언트가 보낸 문자열이 DB에 없으면 400으로 거절한다. 문자열 크기 비교는 쓰지 않는다. `1.10.0`과 `1.9.0`이 뒤집히는 문제를 피하기 위해서다.

응답 필드는 요구사항 그대로다. `latest_version`, `download_url`, `release_notes`, `is_mandatory`, `update_available`.

## 설치 파일 업로드

Vercel 서버리스 함수의 요청 본문 한도는 4.5MB다. APK, EXE, DMG는 이 한도를 넘는다. Server Action이 파일 바이트를 받아 R2로 다시 올리면 배포 환경에서 실패한다.

그래서 Server Action은 권한 검사와 메타데이터 저장을 맡고, 바이트는 브라우저가 R2로 직접 보낸다.

1. `createReleaseUpload` Server Action: 관리자 확인, 버전·플랫폼·파일명 검증, R2 presigned PUT URL과 `r2_object_key` 반환.
2. 브라우저: presigned URL로 파일 PUT, 진행률 표시.
3. `finalizeRelease` Server Action: 객체가 버킷에 있는지 확인한 뒤 `releases`에 insert.

R2 자격 증명은 서버에만 둔다. 버킷 공개 읽기는 다운로드 URL용이고, 쓰기는 서명된 URL로만 연다.

객체 키 규칙:

```text
apps/{appId}/icon/{uuid}.{ext}
apps/{appId}/screenshots/{uuid}.{ext}
apps/{appId}/releases/{platform}/{version_code}/{fileName}
```

## 화면

디자인 기준은 `design-system/ldh-app-store/MASTER.md`다.

| 화면 | 경로 | 구성 |
|------|------|------|
| 스토어 홈 | `/` | 플로팅 헤더, 앱 카드 그리드 |
| 앱 상세 | `/apps/[slug]` | 설명, 스크린샷, 플랫폼별 최신 다운로드, 릴리즈 노트 |
| 로그인 | `/admin/login` | 이메일, 비밀번호 |
| 대시보드 | `/admin` | 앱 표 |
| 앱 등록/수정 | `/admin/apps/new`, `/admin/apps/[id]` | 메타데이터, 아이콘, 스크린샷 |
| 릴리즈 | `/admin/apps/[id]/releases/new` | 버전, 노트, 필수 여부, 파일 |

아이콘은 Lucide. 카드 호버는 테두리 색만 바꾼다. 폼은 라벨, 제출 중 비활성, 성공/오류 메시지를 갖춘다.

## 스키마 결정

최소 컬럼은 요구사항을 그대로 포함한다. 추가 컬럼의 이유:

| 추가 | 이유 |
|------|------|
| `apps.slug`, `short_description` | 사람이 읽는 URL, 그리드용 짧은 문장 |
| `apps.icon_object_key` | 아이콘 교체 시 R2 객체 삭제 |
| `releases.r2_object_key`, `file_name`, `file_size_bytes` | URL 파싱 없이 객체 관리, 관리자 화면에 용량 표시 |
| `screenshots` | 상세 갤러리. 릴리즈마다 두면 마케팅 이미지가 버전 수만큼 복제된다. |
| `admin_users` | 가입한 모든 Auth 사용자를 관리자로 만들지 않기 위한 허용 목록 |
| `version_code` 단조 증가 트리거 | 오래된 빌드 번호가 최신으로 보이는 사고를 막는다 |

최신 릴리즈 플래그 컬럼은 두지 않는다. 플래그는 새 릴리즈 insert 때 이전 행 갱신을 빠뜨리면 두 개가 동시에 최신이 된다. 조회는 `version_code desc limit 1`이다.

## 보안

- anon 키는 공개 읽기만 한다.
- 서비스 롤 키는 앱 런타임에 넣지 않는다. 첫 관리자 insert만 SQL Editor에서 한다.
- RLS: `apps`, `releases`, `screenshots`는 전원 읽기, `is_admin()`만 쓰기.
- `admin_users`는 본인 행만 select. insert 정책은 없다.
- 다운로드 URL은 공개 URL이다. 비공개 배포가 필요해지면 presigned GET으로 바꾼다. 현재 범위는 공개 배포다.

## 의존성

2단계에서 설치한다. Next.js 14, TypeScript, Tailwind, shadcn/ui, `@supabase/supabase-js`, `@supabase/ssr`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `zod`, `react-hook-form`.

## 리스크

- R2 버킷이 공개 읽기가 아니면 스토어 다운로드와 `next/image`가 실패한다.
- `version_code`를 플랫폼마다 따로 올리지 않으면 트리거가 insert를 거절한다. Android 12 다음 Windows 첫 릴리즈는 각 플랫폼의 최댓값 기준으로 비교하므로 1부터 시작해도 된다.
- 서명된 PUT URL의 만료 시간을 짧게(예: 10분) 두지 않으면 유출된 URL로 덮어쓰기가 가능하다.

## 다음 단계

2단계: 패키지 설치, `.env.local` 템플릿, R2용 S3 클라이언트 설정 설명.
