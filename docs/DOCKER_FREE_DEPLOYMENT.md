# Docker-free deployment plan

## Target

- **Frontend:** Vercel static hosting, built from `frontend/`.
- **Auth, database and media:** Supabase Auth, Postgres and Storage.
- **AI Coach:** OpenAI API called from a server-side function only; never ship an API key to the browser.
- **Access:** invite-only for three named accounts; per-user workout data enforced with row-level security.

## Important migration boundary

The current openGym app is not a static-only app: `api/server.js` implements authentication/passkeys, sync, uploads, push notifications and other routes, and persists data on disk. A Vercel static deployment alone will **not** replace that API. The SQL migration in `supabase/migrations/` creates the secure data foundation, but the existing frontend/API have not yet been switched to Supabase. Do not point production traffic at the static build until the API routes have been ported and tested.

## Migration order

1. Configure a Supabase Auth provider and verify HTTPS callback URLs.
2. Apply the SQL migration and create a private Storage bucket for user media.
3. Port auth, profile, invite redemption, state sync and media endpoints to Supabase-backed functions; preserve the existing API contracts where possible.
4. Port the OpenAI Coach endpoint to a server-side function and store the key in Supabase/Vercel secrets.
5. Configure Vercel with root directory `frontend`, build command `npm run build`, output directory `dist`, and set the public Supabase URL/key only after the client adapter is implemented.
6. Run regression tests for exercise catalogue, workout logging, routines, progress, import/export, passkeys/auth, media and all 19 locales before enabling the three accounts.

## Security

Never commit service-role keys, OpenAI API keys, invite tokens or user workout data. The public Supabase anon/publishable key is safe only with RLS enabled. Keep AGPL-3.0-or-later notices and source attribution intact.
