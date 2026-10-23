-- Docker-free personal openGym foundation (Supabase Postgres).
-- Apply only when migrating the app's API/auth to Supabase; the existing API does not use these tables yet.
create extension if not exists pgcrypto;

create table if not exists public.gym_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Athlete',
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gym_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.gym_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  object_path text not null unique,
  media_type text not null default 'application/octet-stream',
  created_at timestamptz not null default now()
);

create table if not exists public.gym_invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  used_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  used_at timestamptz
);

alter table public.gym_profiles enable row level security;
alter table public.gym_state enable row level security;
alter table public.gym_media enable row level security;
alter table public.gym_invites enable row level security;

drop policy if exists "profile owner read" on public.gym_profiles;
create policy "profile owner read" on public.gym_profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists "profile owner update" on public.gym_profiles;
create policy "profile owner update" on public.gym_profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "state owner all" on public.gym_state;
create policy "state owner all" on public.gym_state for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "media owner all" on public.gym_media;
create policy "media owner all" on public.gym_media for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Invite rows are intentionally inaccessible to normal clients. Validate and redeem through
-- a server-side Edge Function using the service role key; never expose that key in the browser.
revoke all on public.gym_invites from anon, authenticated;
