# openGym Personal Instance — Product Requirements Document

**Status:** Source of truth for the personal deployment and Supabase migration  
**Date:** 2026-10-23  
**Repository:** https://github.com/abhradeepnet2026/openGym  
**Working branch:** personal-fitness-fullstack  
**Live deployment (temporary):** https://opengym-personal.onrender.com

## 1. Goal

Deliver a reliable, secure, fully functioning personal openGym web app for up to three invited people, using free-tier services only. Supabase is the authoritative persistent data and media store. Remove Render from the final architecture only after a replacement has been deployed and verified.

## 2. Non-goals

- No paid plans, paid APIs, or paid infrastructure.
- No broad rewrite of the openGym product or removal of existing capabilities merely to simplify deployment.
- No public open registration.
- No destructive database or storage migration without a tested backup/rollback path.
- Do not claim the app is complete based only on a successful build or server startup.

## 3. Users and access

- Maximum three accounts.
- Invite-only account creation.
- First successfully created account becomes owner/admin on a clean installation.
- Owner/admin can manage invites and user access using existing app capabilities.
- Each user’s workouts, body measurements, plans, custom exercise media, settings, and private records must be isolated from other users except explicitly authorized admin operations.
- Guests remain disabled for this hosted private instance.
- Existing passkey/WebAuthn and password-login behaviour must be preserved unless a replacement is demonstrably necessary and the user is informed.

## 4. Core product requirements

1. Sign up and sign in securely; session survives refresh and normal return visits.
2. Manage workout plans, routines, exercises, workout logs, body-weight/history, and existing synced state.
3. Import/paste an external workout plan and preview exercise matches before adding it.
4. Sync user data across devices without silently overwriting newer data.
5. Upload, view, and remove supported custom exercise photos/videos with per-user access checks.
6. Preserve existing admin, invite, account, passkey, and security controls.
7. Preserve the existing Coach and notification features where their runtime dependencies can be supported; explicitly test each and document any feature that must be redesigned.
8. Provide a useful health endpoint and actionable error handling.
9. Keep the frontend responsive and usable on desktop and mobile.

## 5. Architecture direction

- **Supabase Postgres:** authoritative storage for user/profile metadata, authentication-related records needed by the chosen auth model, invites, workout state, settings, and sync revisions.
- **Supabase Storage:** private bucket(s) for user-generated exercise media. Use server-side authorization or policies that enforce ownership; never use public buckets for private uploads.
- **Backend runtime:** prefer a free serverless/edge-compatible implementation. Supabase Edge Functions are Deno-based and do not run the current Node server unchanged. Evaluate route-by-route compatibility before migrating. If an unavoidable Node-only feature exists, document it and identify a free alternative before asking the user.
- **Frontend:** free static hosting with HTTPS and SPA fallback, served from the same origin as the API where practical to keep WebAuthn origin/RP ID consistent.
- **Secrets:** service-role/secret keys stay server-side only. Only publishable/anon keys may appear in the browser, alongside restrictive RLS policies.
- **Free-only:** verify free-tier limits before choosing any provider. No paid resources without explicit approval.

## 6. Data and security requirements

- No loss of accounts, passkeys, sessions, invites, workout state, custom media, or coach configuration during migration.
- Use least privilege, row-level security on exposed tables, and ownership predicates in policies.
- Never trust client-supplied user IDs or role/admin flags.
- Hash invite/reset tokens; do not log passwords, session secrets, private keys, or service-role keys.
- Validate inputs and limit payload sizes.
- Protect state writes against stale updates; use revisions/conditional updates or an equivalent conflict-safe strategy.
- Keep backups/export and rollback instructions. Never point production to an empty replacement store without an explicit cutover plan.
- Keep test fixtures and secrets out of production data.

## 7. Workout-plan importer

- Paste text or import .txt, .md/.markdown, and supported openGym JSON.
- Preview parsed routines/exercises and matching results before committing.
- Explain unmatched/unsupported exercises and allow the user to review rather than silently claiming perfect AI interpretation.
- Preserve existing plan and exercise data unless the user confirms adding/importing.

## 8. Acceptance criteria

### Build and quality
- Existing frontend build and API tests pass.
- New migration/backend tests pass in CI.
- No known failing critical test is ignored.

### Authentication
- First account can become owner/admin once only.
- Invited second/third accounts can register and sign in.
- Fourth account is rejected.
- Passkey and configured password flows work on HTTPS.
- Session expiry/revocation and CSRF/origin protections remain effective.

### Data durability and isolation
- Create/edit workout and body-weight records, reload, and confirm persistence.
- Verify data survives backend cold start/redeploy.
- Verify sync between two devices or browser sessions.
- Verify user A cannot read/write user B's data or media.
- Verify stale writes do not silently erase newer state.

### Media and features
- Upload/read/delete supported media using private storage and ownership checks.
- Test importer formats and unmatched-exercise reporting.
- Smoke-test admin/invites, notifications, Coach, account settings, and health route; record any limitations.

### Deployment
- HTTPS and correct WebAuthn RP ID/origin.
- All production environment variables are documented.
- Live health check and browser-based end-to-end flows pass.
- Keep current Render deployment until replacement passes; then remove it only after user-visible confirmation of successful cutover.

## 9. Phased execution plan

1. **Baseline audit:** inventory routes, filesystem persistence, secrets, runtime dependencies, and existing tests. Record current behaviour.
2. **Architecture decision:** map each route/feature to a Supabase Edge Function or another free compatible runtime. Do not assume Node APIs work in Deno.
3. **Schema and storage:** create versioned migrations with RLS, private media bucket policies, indexes, and conflict-safe revisions. Test policies.
4. **Backend migration:** move persistence and authentication safely; port or replace Node-only modules intentionally.
5. **Frontend and hosting:** configure environment, HTTPS, SPA fallback, API routing, and WebAuthn origin.
6. **Verification:** run unit/integration tests, security/isolation tests, and live end-to-end flows.
7. **Cutover:** back up/export current data if any exists, switch only after verification, preserve rollback, and remove Render only after success.
8. **Final handoff:** summarize live URL, architecture, tested features, known limitations, free-tier constraints, and any action required from the user.

## 10. Definition of done

The app is only complete when the acceptance criteria above are tested on the deployed replacement, data persists in Supabase, user isolation is verified, critical login/workout/import/media flows work, and the user receives a concise handoff. A green build or running service alone is not completion.

## 11. Work tracking

Update this document when scope, architecture, acceptance criteria, or phase status changes. Keep a separate implementation checklist with evidence (test run, migration result, endpoint result) rather than marking items complete based on intention.
