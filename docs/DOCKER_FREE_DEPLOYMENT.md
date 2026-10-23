# Docker-free deployment

## Native Node deployment (implemented)

This repository now includes a Render Blueprint at `render.yaml`. It builds the existing React/Vite frontend and runs the existing Node API in the same service. The API can serve the built frontend from `WEB_ROOT`, so browser requests and passkey sessions stay same-origin; the existing API contracts are retained rather than replaced with an incomplete static demo.

### Deploy

1. Push the `personal-fitness-fullstack` branch to your GitHub repository.
2. In Render, create a Blueprint from that repository and review `render.yaml`.
3. The blueprint uses a **paid Starter service with a persistent disk**. Do not change it to an ephemeral free instance: the existing API stores passkeys, session secrets, account records, workout state and uploads under `DATA_DIR`; losing that disk can lock users out and lose data.
4. Wait for the build and health check at `/api/health` to pass.
5. Open the service URL over HTTPS. The first profile is configured to become the owner/admin. Create invite codes in the app's admin area for the other two people.
6. Set `OPENAI_API_KEY` as a secret in the host dashboard if using OpenAI-backed Coach features. Never put it in a `VITE_*` variable or commit it to Git.
7. Configure any optional push/AI provider settings from the app's admin UI as needed.

The blueprint defaults `ORIGIN` to Render's service URL and `RP_ID` to its hostname for passkey origin validation. If you attach a custom domain, update `ORIGIN` and `RP_ID` to that exact HTTPS origin/hostname.

## Runtime behavior

- `WEB_ROOT=frontend/dist`: serves the compiled app and its assets from the Node service.
- `CATALOGUE_MEDIA_ROOT=catalogue/media`: serves the exercise stills and clips shipped with the repo.
- `DATA_DIR=/var/data`: stores the existing file-backed database, user state, session secret and uploaded media on the persistent disk.
- `INVITE_ONLY=1`, `ALLOW_GUEST=0`: require accounts and invite codes.
- `FIRST_USER_ADMIN=1`: makes the first registered account owner/admin on a fresh install.
- `PASSWORD_LOGIN=1`: enables the existing optional password login alongside passkeys.

## Supabase migration status

The Supabase SQL migration is a separate, **not-yet-applied** foundation; the existing API has not been ported to Supabase Auth/Postgres/Storage. The native Node deployment is the path intended to preserve the existing feature set now. Do not treat the Supabase schema alone as a replacement for the current API.

## Before calling it production-ready

- Confirm the GitHub Actions build and API tests pass.
- Test account creation, invite redemption, passkey and password sign-in, sign-out, and cross-device sync.
- Test workout logging, routines, body-weight/progress views, import/export, media upload/download, and the Coach.
- Test backup/restore of the persistent disk and confirm the service recovers from a restart.
- Keep OpenAI and other provider credentials in server-side secrets only.
- Keep the AGPL-3.0-or-later license and upstream attribution intact.
