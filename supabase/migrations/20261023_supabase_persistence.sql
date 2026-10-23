-- openGym personal deployment: server-only persistence for the existing custom auth model.
-- This schema intentionally does NOT reference auth.users: the current API owns WebAuthn/passkey
-- and password identities. The service backend must use a server-only Supabase secret key.
-- Do not expose these tables to anon/authenticated clients; row-level security is defense in depth.

create table if not exists public.gym_instance_store (
  id smallint primary key check (id = 1),
  payload jsonb not null default '{"users":[],"creds":[],"subs":[],"invites":[],"deviceLinks":[]}'::jsonb,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.gym_user_state (
  user_id text primary key check (length(user_id) between 1 and 160),
  state jsonb not null default '{}'::jsonb,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.gym_audit_events (
  id bigint generated always as identity primary key,
  event_id bigint not null,
  occurred_at timestamptz not null,
  event_type text not null check (length(event_type) between 1 and 120),
  user_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (event_id)
);

create index if not exists gym_audit_events_occurred_at_idx
  on public.gym_audit_events (occurred_at desc);

create table if not exists public.gym_media_objects (
  user_id text not null check (length(user_id) between 1 and 160),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  object_path text not null unique,
  media_type text not null,
  byte_size bigint not null check (byte_size >= 0),
  created_at timestamptz not null default now(),
  primary key (user_id, content_hash)
);

-- No client-side Supabase auth is assumed. All writes/reads go through the trusted API, which
-- verifies its own signed session before accessing these tables with the server-only key.
alter table public.gym_instance_store enable row level security;
alter table public.gym_user_state enable row level security;
alter table public.gym_audit_events enable row level security;
alter table public.gym_media_objects enable row level security;

revoke all on table public.gym_instance_store from anon, authenticated;
revoke all on table public.gym_user_state from anon, authenticated;
revoke all on table public.gym_audit_events from anon, authenticated;
revoke all on table public.gym_media_objects from anon, authenticated;

-- Private bucket: never publish user exercise uploads. The current API will proxy downloads and
-- uploads after its storage adapter is implemented, so clients do not need direct bucket access.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gym-user-media',
  'gym-user-media',
  false,
  41943040,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/webm']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- No storage.objects policies are granted to anon/authenticated: all object access is proxied by
-- the trusted API after checking the app's custom session and user ownership.
