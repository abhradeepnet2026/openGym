# Personal openGym deployment

Goal: run the existing openGym full-stack app for three invited people, preserving upstream features.

- Keep the React/Vite frontend, Node API, exercise library and animations, passkeys, per-user sync, routines, workout logs, progression, personal records, body-weight tracking, media uploads, import/export, language support, push notifications, Coach and MCP support.
- The owner's personal target is 84 kg to 75 kg. Set this inside that profile's settings; never hardcode it for other users.
- Use Settings → Admin → Coach to connect OpenAI with an API key and chat-capable model. Never put the API key in frontend variables or Git. Use an API key with a usage limit appropriate for three people; do not share personal OAuth/session credentials.
- Restrict registration with the existing invite-only feature and disable guest mode. Register the owner first, then create two invite codes for the other users.
- This app requires both the web frontend and a persistent Node API. Docker Compose is the supported full-stack setup. Vercel alone is not a complete deployment for the existing API/data model.
- Use a real HTTPS hostname before creating passkeys. Set RP_ID to the hostname and ORIGIN to its HTTPS origin. Persist and back up the API data directory, which contains account/passkey state, sessions secret, user data and uploaded media.
- Verify health endpoint, account isolation, invites, workouts, routines, weight tracking, imports/exports, uploads, language selection, sync, AI Coach and notifications before considering it production-ready.

This guide is deployment guidance, not a claim that deployment or the full test suite has completed. Preserve the AGPL-3.0-or-later license and notices.