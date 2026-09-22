# 02. 환경 변수와 연동

- **목적:** Vercel에 올리기 전에 Supabase, R2, 첫 관리자 계정을 연결한다.
- **범위:** 패키지, 환경 변수, R2 S3 클라이언트, 업로드 절차, 버전 체크 API.

## 패키지

이미 `package.json`에 고정해 두었다. 다시 설치할 때는 프로젝트 루트에서 `npm install`을 실행한다.

주요 패키지:

- `next@14`, `react@18`, `tailwindcss@3`
- `@supabase/supabase-js`, `@supabase/ssr`
- `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
- `zod`, `react-hook-form`, shadcn 스타일 UI에 쓰는 Radix Label/Slot

## 환경 변수

`.env.example`을 `.env.local`로 복사한 뒤 값을 채운다. `.env.local`은 git에 올리지 않는다.

| 변수 | 용도 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 공개 anon 키. RLS가 쓰기를 막는다. |
| `R2_ACCOUNT_ID` | 엔드포인트의 계정 ID |
| `R2_ACCESS_KEY_ID` | R2 S3 액세스 키 |
| `R2_SECRET_ACCESS_KEY` | R2 비밀키. 서버에서만 읽는다. |
| `R2_BUCKET_NAME` | 버킷 이름 |
| `R2_PUBLIC_BASE_URL` | 공개 읽기 주소. `https://`로 시작하고 끝에 슬래시가 없다. |

서비스 롤 키는 넣지 않는다. 첫 관리자 등록만 Supabase SQL Editor에서 한다.

`R2_PUBLIC_BASE_URL`은 `next.config.mjs`가 빌드할 때 읽어 `next/image` 허용 호스트로 등록한다. 값을 바꾼 뒤에는 개발 서버와 배포 빌드를 다시 실행한다.

## 데이터베이스

1. Supabase에서 이메일 로그인을 켠다.
2. SQL Editor에서 `supabase/schema.sql`을 실행한다.
3. Authentication에서 관리자 사용자를 만든다.
4. 그 사용자의 UUID로 허용 목록에 넣는다.

```sql
insert into public.admin_users (user_id)
values ('여기에-auth-users-id');
```

## R2 클라이언트

`lib/r2.ts`가 S3 클라이언트를 R2에 맞게 만든다.

- `region`은 `auto`다. R2는 AWS 리전 이름을 받지 않는다.
- `endpoint`는 `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`이다.
- `requestChecksumCalculation`과 `responseChecksumValidation`은 `WHEN_REQUIRED`다. SDK가 기본으로 붙이는 CRC32 체크섬은 R2 서명 URL과 맞지 않아 PUT이 거절된다.

업로드는 세 단계다.

1. `createReleaseUpload` Server Action이 관리자 권한과 파일 형식을 검사하고 presigned PUT URL을 10분 동안 발급한다.
2. 브라우저가 그 URL로 파일을 직접 PUT한다.
3. `finalizeRelease`가 HeadObject로 크기와 존재를 확인한 뒤 `releases`에 insert한다.

버킷 CORS 예시는 아래와 같다. `AllowedOrigins`에는 로컬과 Vercel 도메인을 넣는다.

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://your-app.vercel.app"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

버킷 공개 접근(r2.dev 또는 커스텀 도메인)을 켜야 스토어의 다운로드 링크가 동작한다.

## 버전 체크

`GET /api/update-check`

| 쿼리 | 설명 |
|------|------|
| `app_id` | 앱 UUID. `package_name`과 둘 중 하나 |
| `package_name` | 예: `kr.ulsan.ldh.myapp` |
| `current_version` | 이미 스토어에 있는 `version_string` |
| `platform` | `android`, `windows`, `macos`, `linux` |

최신 버전은 해당 플랫폼에서 `version_code`가 가장 큰 행이다. 그 사이에 필수 릴리즈가 하나라도 있으면 `is_mandatory`는 `true`다. 응답에 캐시를 남기지 않는다.

## 화면

디자인 기준은 `design-system/ldh-app-store/MASTER.md`다. 배경 `#FAFAFA`, 본문 `#09090B`, 다운로드 버튼 `#2563EB`, 서체는 Noto Sans KR이다. 버전과 패키지 이름만 Fira Code를 쓴다.

## 리스크

- CORS 또는 공개 도메인이 없으면 관리자 업로드와 방문자 다운로드가 실패한다.
- `version_code`는 플랫폼마다 따로 증가해야 한다. 트리거가 더 작은 번호를 거절한다.
- 릴리즈 행은 일부러 삭제하지 않는다. 클라이언트가 보내는 현재 버전이 DB에 있어야 비교할 수 있다.
