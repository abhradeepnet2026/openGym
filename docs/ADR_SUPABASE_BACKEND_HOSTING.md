# Architecture Decision Record — Supabase persistence and backend hosting

**Status:** Proposed; validate with a deployable proof of concept before cutover  
**Date:** 2026-10-23  
**Related:** [PRD](PRD_PERSONAL_SUPABASE_DEPLOYMENT.md), [implementation checklist](IMPLEMENTATION_CHECKLIST_PERSONAL_DEPLOYMENT.md)

## Decision to test

Use Supabase Postgres and private Storage as the durable source of truth. Do not move the existing API to Supabase Edge Functions as a blind lift-and-shift. Keep the current Render deployment as a temporary rollback path while evaluating a free Node-compatible runtime; do not remove it until the replacement passes the PRD acceptance criteria.

This is a proposed engineering direction, not a completed deployment or a claim that Render must remain permanently.

## Evidence

1. The current API is a long-lived Node HTTP server with many routes and uses filesystem persistence for accounts/passkeys/invites, a signing secret, per-user state, VAPID keys, audit records, uploads, and Coach configuration/jobs.
2. The API imports `@simplewebauthn/server`, `web-push`, Node crypto/fs/http/https/dns/net and has a Coach adapter that uses `child_process.spawn` to run provider CLIs.
3. Supabase Edge Functions run in a Deno-based environment. Supabase provides a Postgres REST API and object storage, but neither automatically converts the existing filesystem and process model.
4. Cloudflare Workers has useful Node.js compatibility, including a virtual in-memory filesystem. Its documented filesystem is temporary and constrained, and child-process support is not equivalent to a full Linux process environment. That is not sufficient to treat the current API as compatible without a substantial port and removal/replacement of child-process-dependent Coach execution.
5. Render free web services lose local filesystem changes on redeploy/restart/idle spin-down, so local files must not remain the only copy of important state.
6. Koyeb documents a free instance for Node.js/container services, but current account/payment verification requirements and region/resource limits must be checked in the actual deployment flow before selecting it. No new service has been created.

## Options

| Option | Advantages | Risks / constraints | Decision |
|---|---|---|---|
| Keep Render API + Supabase Postgres/Storage | Lowest runtime rewrite; can first make data durable | Render remains a runtime dependency; must remove all critical reliance on ephemeral files | Best migration baseline |
| Move Node API to a free Node-compatible host + Supabase | Removes Render while preserving more of the Node runtime | Free availability/verification requirements may vary; still needs deployment and runtime testing | Evaluate next |
| Port entire API to Supabase Edge Functions | Supabase-centered hosting | Large rewrite for auth, WebAuthn, push, streaming uploads, filesystem, and Coach child processes; high regression risk | Do not choose without a route-by-route port plan |

## Guardrails

- Supabase service-role/secret credentials stay server-side and never enter frontend bundles.
- Do not apply the existing migration unchanged: it references `auth.users`, while the current server owns a custom passkey/password identity store. First decide whether to preserve custom auth or migrate identities deliberately.
- Do not create public media storage for user uploads.
- Do not perform a production cutover until login, workout persistence, sync, media, isolation, and rollback have passed.
- Do not remove Render or change DNS until the user has a verified working replacement.
- No paid resources; stop and notify the user if a necessary provider requires a paid plan or payment commitment.

## Next implementation step

Build a route/persistence inventory and a small Supabase integration proof of concept behind a server-side storage interface. Verify the chosen schema and RLS policies in the actual project before wiring production writes. Use synthetic test records, not real user credentials. Keep the old persistence path available until migration and rollback tests pass.
