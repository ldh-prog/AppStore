-- LDH App Store schema
-- Supabase SQL Editor에서 한 번 실행한다.
-- 공개 읽기, 관리자 쓰기는 RLS로 강제한다.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- apps
-- 그리드는 short_description, 상세 본문은 description을 쓴다.
-- slug는 URL(/apps/[slug]), package_name은 업데이트 API 조회 키다.
-- ---------------------------------------------------------------------------

create table public.apps (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  package_name text not null unique check (char_length(btrim(package_name)) between 3 and 200),
  short_description text not null check (char_length(btrim(short_description)) between 1 and 160),
  description text not null default '',
  icon_url text,
  icon_object_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.apps is '공개 카탈로그에 노출되는 앱 메타데이터';
comment on column public.apps.package_name is '클라이언트 식별자. Android applicationId 또는 역도메인. 업데이트 API 조회 키.';
comment on column public.apps.icon_object_key is 'R2 객체 키. 아이콘 교체 시 이전 객체 삭제에 사용.';

-- ---------------------------------------------------------------------------
-- releases
-- 최신 버전은 플래그로 저장하지 않는다.
-- (app_id, platform)별 version_code 최댓값이 최신 릴리즈다.
-- ---------------------------------------------------------------------------

create table public.releases (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps (id) on delete cascade,
  version_string text not null check (version_string ~ '^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$'),
  version_code integer not null check (version_code > 0),
  platform text not null check (platform in ('android', 'windows', 'macos', 'linux')),
  download_url text not null check (download_url ~ '^https://'),
  r2_object_key text not null,
  file_name text not null,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  release_notes text not null default '',
  is_mandatory boolean not null default false,
  created_at timestamptz not null default now(),
  unique (app_id, platform, version_code),
  unique (app_id, platform, version_string)
);

comment on table public.releases is '플랫폼별 설치 파일 릴리즈. version_code가 비교의 기준이다.';
comment on column public.releases.version_code is '같은 앱+플랫폼 안에서 단조 증가. 업데이트 API는 이 값으로 최신 여부를 판단한다.';
comment on column public.releases.r2_object_key is '버킷 안 객체 키. download_url은 공개 읽기 주소.';

create index releases_latest_idx
  on public.releases (app_id, platform, version_code desc);

-- ---------------------------------------------------------------------------
-- screenshots
-- 상세 페이지 갤러리. 릴리즈가 아니라 앱에 속한다.
-- ---------------------------------------------------------------------------

create table public.screenshots (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps (id) on delete cascade,
  image_url text not null check (image_url ~ '^https://'),
  r2_object_key text,
  alt_text text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index screenshots_app_order_idx
  on public.screenshots (app_id, sort_order, created_at);

-- ---------------------------------------------------------------------------
-- admin_users
-- Supabase Auth 사용자 중 이 테이블에 있는 계정만 쓰기 권한을 가진다.
-- 회원가입만으로 관리자가 되지 않게 허용 목록으로 둔다.
-- ---------------------------------------------------------------------------

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admin_users is '관리자 허용 목록. 첫 계정은 대시보드 SQL로 직접 넣는다.';

-- ---------------------------------------------------------------------------
-- updated_at, version_code 단조 증가
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger apps_set_updated_at
  before update on public.apps
  for each row
  execute function public.set_updated_at();

create or replace function public.enforce_release_version_order()
returns trigger
language plpgsql
as $$
declare
  max_code integer;
begin
  select coalesce(max(version_code), 0)
    into max_code
  from public.releases
  where app_id = new.app_id
    and platform = new.platform
    and id is distinct from new.id;

  if new.version_code <= max_code then
    raise exception
      'version_code(%) must be greater than existing max(%) for this app and platform',
      new.version_code,
      max_code
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger releases_version_order
  before insert or update of version_code, app_id, platform on public.releases
  for each row
  execute function public.enforce_release_version_order();

-- ---------------------------------------------------------------------------
-- Auth helper
-- security definer: RLS가 admin_users 조회를 막더라도 권한 판별은 가능하다.
-- search_path를 고정해 검색 경로 하이재킹을 막는다.
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.apps enable row level security;
alter table public.releases enable row level security;
alter table public.screenshots enable row level security;
alter table public.admin_users enable row level security;

create policy apps_public_read
  on public.apps
  for select
  to anon, authenticated
  using (true);

create policy apps_admin_write
  on public.apps
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy releases_public_read
  on public.releases
  for select
  to anon, authenticated
  using (true);

create policy releases_admin_write
  on public.releases
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy screenshots_public_read
  on public.screenshots
  for select
  to anon, authenticated
  using (true);

create policy screenshots_admin_write
  on public.screenshots
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 본인 행만 읽는다. 삽입은 서비스 롤 또는 SQL Editor로만 한다.
create policy admin_users_read_self
  on public.admin_users
  for select
  to authenticated
  using (user_id = auth.uid());

grant select on public.apps, public.releases, public.screenshots to anon, authenticated;
grant insert, update, delete on public.apps, public.releases, public.screenshots to authenticated;
grant select on public.admin_users to authenticated;

-- ---------------------------------------------------------------------------
-- 첫 관리자 등록 (Auth에 사용자를 만든 뒤 실행)
-- insert into public.admin_users (user_id)
-- values ('00000000-0000-0000-0000-000000000000');
-- ---------------------------------------------------------------------------
