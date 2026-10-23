# openGym Personal Deployment — Implementation Checklist

Tracks evidence for `docs/PRD_PERSONAL_SUPABASE_DEPLOYMENT.md`. Do not mark a phase complete without a test result or verified deployment evidence.

## Current phase: 2 — persistence adapter and runtime decision

- [x] Confirm working branch and current commit.
- [x] Confirm Supabase project is active.
- [x] Confirm Supabase persistence tables exist in `public`; production queries on 2026-10-24 found all four new tables empty.
- [x] Audit the API's core filesystem persistence and Node-only dependencies.
- [x] Confirm workout-plan paste/import exists in the working branch.
- [x] Create PRD, implementation checklist, and architecture decision record.
- [x] Add a custom-auth-compatible Supabase schema migration. Live migration history records `opengym_private_persistence` as applied; do not reapply blindly.
- [x] Add a server-only revision-aware PostgREST adapter and mocked unit tests (not wired into production API).
- [x] Confirm CI is green on PR head `a9a169985531f86127413db93a9cfb56daccc9ae`: `Tests` run 40012638963 and `Docker-free full-stack checks` run 40012638964 both completed successfully (2026-10-23 UTC).
- [ ] Complete route-by-route runtime inventory and decide a deployable free Node-compatible host.
- [ ] Capture a live health check from a direct HTTP-capable runtime and complete route inventory. GitHub/Render connectors do not provide a generic HTTP probe; do not count this as verified.

### Verified findings (updated 2026-10-24)

- Branch: `personal-fitness-fullstack`
- Latest PR/deployed commit: `a9a169985531f86127413db93a9cfb56daccc9ae` (documentation-only update following green CI on the code baseline).
- PR: https://github.com/abhradeepnet2026/openGym/pull/1 (open; do not merge without authorization)
- Live temporary URL: https://opengym-personal.onrender.com
- Supabase project ref: `zbohwbzqkqlhahgjvvkn`; status was previously verified `ACTIVE_HEALTHY`.
- API is a long-lived Node HTTP server. It uses `@simplewebauthn/server`, `web-push`, optional Claude Agent SDK, Node crypto/fs/http/https/dns/net, and child-process execution in Coach adapters.
- Existing local persistence includes `db.json` (user records, passkeys, push subscriptions, invites and device links), `secret` (session-signing secret), per-user state JSON files, `vapid.json`, audit log, uploads/media, and Coach config/job files.
- Coach provider execution uses child processes and filesystem-backed job/config data; Supabase Edge Functions cannot run this API unchanged.
- Existing `supabase/migrations/20261023_personal_instance.sql` assumes Supabase Auth identities and is not compatible as-is with the app's custom passkey/password identity model. It remains unapplied.
- New `supabase/migrations/20261023_supabase_persistence.sql` defines server-only JSONB instance/state tables, audit/media metadata, and a private media bucket. Supabase migration history reports `20261023171843 / opengym_private_persistence`; the four matching tables exist and live SQL counts show 0 rows in each. The migration is applied; no production records are present in those tables.
- New `api/supabase-store.js` provides revision-aware REST reads and compare-and-swap writes. It is **not wired into `api/server.js`** and therefore does not yet make production workout/auth state persistent.
- New `api/test/supabase-store.test.js` covers request authentication, empty state, revision filtering, conflicts, validation, and safe error messages. PR-head `Tests` run 40012638963 and `Docker-free full-stack checks` run 40012638964 passed.
- Do not expose the Supabase server secret/service-role key in frontend code.
- Render `DATA_DIR=/tmp/opengym-data` is ephemeral; do not treat it as durable storage.

- Supabase security advisor reports informational `rls_enabled_no_policy` findings for all four tables. This matches the migration's server-only intent (no direct anon/authenticated grants), but must be checked again after backend integration; do not add broad client policies to silence the warning.
- Render service remains on the free plan and latest deployment `dep-dbdre48u01pc73drde30` is `live`; deployed commit is `a9a1699`.

## Architecture decision gate

Preferred direction is to preserve the current custom WebAuthn/password auth model initially, use Supabase Postgres + private Storage for durability, and run the API on a free Node-compatible runtime. The exact runtime is not selected until its current free-tier constraints and this API's compatibility are verified. Render stays as a temporary fallback until cutover succeeds.

Do not apply the schema or switch production writes until the adapter is integrated, schema is reviewed, integration tests pass, and a rollback/export path exists.

## Phase 2 — architecture and adapter

- [x] Choose the initial persistence model compatible with existing custom auth records.
- [x] Add revision-aware adapter interface for instance and per-user state.
- [x] Add mocked unit tests for the adapter.
- [x] Verify CI tests: PR-head runs 40012638963 and 40012638964 completed successfully.
- [ ] Compare free Node-compatible hosting options and verify current limitations.
- [ ] Inventory all routes and background jobs and identify Node-only requirements.
- [ ] Decide how signing secrets, VAPID keys, audit logs, Coach jobs/config, and uploads will be persisted.
- [ ] Update architecture record with the runtime decision and evidence.

## Phase 3 — database and storage

- [x] Draft schema with no assumed `auth.users` foreign keys.
- [x] Draft least-privilege grants/RLS and a private media bucket in a versioned migration.
- [ ] Review migration against Supabase schema and storage API.
- [x] Confirm live migration was applied externally; integration testing and any schema changes remain gated.
- [ ] Add integration tests against a non-production/test record.
- [ ] Implement private Supabase Storage adapter with per-user ownership checks.
- [ ] Verify revision conflict behaviour and database/storage policies with live test queries.
- [ ] Document export/backup and rollback.

## Phase 4 — backend, frontend, deployment

- [ ] Integrate async Supabase persistence safely; the current API assumes synchronous local-file reads/writes in many routes and cannot be switched by changing one helper.
- [ ] Migrate signing secrets and VAPID keys safely.
- [ ] Migrate audit logs and Coach config/jobs or document approved alternatives.
- [ ] Configure a free Node-compatible API host and free HTTPS static frontend hosting.
- [ ] Preserve passkey RP ID/origin, session, CSRF and origin protections.
- [ ] Add secrets only to server-side environment.
- [ ] Keep Render online until the replacement passes acceptance tests.

## Phase 5 — verification and cutover

- [ ] Existing API and frontend tests pass.
- [ ] Sign-up/login, session, invites, three-user limit and owner/admin flow pass.
- [ ] Workout write/read and cross-device sync pass.
- [ ] Cold start/redeploy persistence passes.
- [ ] Cross-user data and media isolation tests pass.
- [ ] Import/paste, admin, Coach, notifications and media tests pass or approved alternatives are documented.
- [ ] Live health check and browser end-to-end tests pass.
- [ ] Export/rollback plan verified.
- [ ] Notify user of any required manual action before cutover.
- [ ] Remove Render only after successful verified cutover.

## User actions currently required

None at this stage. Do not merge the PR without authorization. The CLA workflow has previously failed independently due to repository setup. Live health endpoint and auth/workout browser flows are still not verified. REA (https://github.com/morluto/rea) is a local reverse-engineering tool for inspected artifacts and is not part of the production runtime; use it only if a local checkout and analysis workflow are available.
