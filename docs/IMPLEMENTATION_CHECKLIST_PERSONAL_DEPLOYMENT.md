# openGym Personal Deployment — Implementation Checklist

Tracks evidence for `docs/PRD_PERSONAL_SUPABASE_DEPLOYMENT.md`. Do not mark a phase complete without a test result or verified deployment evidence.

## Current phase: 1 — baseline audit

- [x] Confirm working branch and current commit.
- [x] Confirm Supabase project is active.
- [x] Confirm no app tables exist in `public`; Supabase's built-in `storage.*` tables are platform internals, not app schema.
- [x] Confirm current API package dependencies and persistence patterns.
- [x] Confirm existing plan-paste/import feature is present in the working branch.
- [ ] Inventory every route and its Node-only dependencies.
- [ ] Capture current baseline test results and live health check.

### Verified findings (2026-10-23)

- Branch: `personal-fitness-fullstack`
- Branch HEAD at audit: `31cfefe0d9306023259780da7c562ddfa8ec66b2`
- PR: https://github.com/abhradeepnet2026/openGym/pull/1 (open; do not merge without authorization)
- Live temporary URL: https://opengym-personal.onrender.com
- Supabase project ref: `zbohwbzqkqlhahgjvvkn`; status was previously verified `ACTIVE_HEALTHY`.
- API is a long-lived Node HTTP server, not a collection of request handlers. Dependencies include `@simplewebauthn/server`, `web-push`, optional Claude Agent SDK, Node crypto/fs/http/https/dns/net, and child-process execution in Coach adapters.
- Persistent local files include:
  - `db.json`: user records, passkey credentials, push subscriptions, invites, device links and associated account metadata.
  - `secret`: signing secret for session cookies.
  - `state-<uid>.json`: per-user synced workout/app state.
  - `vapid.json`: push notification keys.
  - `audit.log`, uploads/media, and Coach config/job files.
- The Coach system invokes provider CLIs using child processes and assumes a local filesystem. A Deno Edge Function cannot host the current API unchanged.
- Existing migration `supabase/migrations/20261023_personal_instance.sql` assumes Supabase Auth users (`auth.users`) and is **not compatible as-is** with the current custom passkey/password auth records. It has not been applied.
- No app schema migration or storage bucket policy has been applied to production during this audit.
- Do not expose service-role/secret keys in the frontend. The project URL and publishable key are not secrets; the secret key must remain server-side.
- Existing Render `DATA_DIR=/tmp/opengym-data` is ephemeral. Do not rely on it for durable user data.

## Architecture decision gate

Before writing a production schema, choose and document one of these paths:

1. **Keep Node API on a free compatible host; use Supabase for Postgres + private Storage.** Lowest rewrite risk. Confirm an actually available free runtime and its limits before choosing it.
2. **Port the API to Supabase Edge Functions.** This is a substantial rewrite: WebAuthn, custom cookie/session logic, push, streaming media, Node filesystem use, and child-process-based Coach jobs all need compatible replacements. Feature parity must be tested.

Do not apply the current `auth.users` migration until the auth strategy is explicitly decided. Do not create an app schema based on assumptions about user IDs or token ownership.

## Phase 2 — architecture decision

- [ ] Compare free Node-compatible hosting options and verify their current free-tier restrictions.
- [ ] Decide whether existing custom WebAuthn auth remains or is migrated to Supabase Auth.
- [ ] Map every API route and background job to its target runtime.
- [ ] Identify feature parity gaps, especially Coach, Web Push, passkeys, and media streaming.
- [ ] Update PRD architecture section if decision changes.

## Phase 3 — database and storage

- [ ] Design schema based on the selected auth model (no assumed `auth.users` foreign keys).
- [ ] Implement versioned migration and least-privilege grants/RLS.
- [ ] Create private media bucket and verify owner-scoped access.
- [ ] Add revision-aware writes and concurrency/conflict tests.
- [ ] Verify tables and bucket policies with live test queries.
- [ ] Document export/backup and rollback.

## Phase 4 — backend, frontend, deployment

- [ ] Implement Supabase persistence behind a testable storage interface.
- [ ] Migrate secrets and session persistence safely.
- [ ] Implement Supabase Storage adapter for user media.
- [ ] Configure free frontend hosting and HTTPS.
- [ ] Preserve passkey RP ID/origin and CSRF protections.
- [ ] Add deployment secrets only in server-side environment.
- [ ] Keep current deployment until new one passes acceptance tests.

## Phase 5 — verification and cutover

- [ ] Existing API and frontend tests pass.
- [ ] Sign-up/login, session, invites, 3-user limit and owner/admin flow pass.
- [ ] Workout write/read and cross-device sync pass.
- [ ] Cold start/redeploy persistence passes.
- [ ] Cross-user data and media isolation tests pass.
- [ ] Import/paste, admin, Coach, notifications and media tests pass or documented alternatives are approved.
- [ ] Live health check and browser end-to-end tests pass.
- [ ] Export/rollback plan verified.
- [ ] User informed of any remaining manual actions before cutover.
- [ ] Remove Render only after successful verified cutover.

## User actions currently required

None for the audit/PRD phase. If a hosting provider or dashboard authorization requires user action, request only the specific required step and do not claim it was completed.
