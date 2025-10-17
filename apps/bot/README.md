## DebtWise Bot

LINE Bot webhook that validates signatures, routes text commands, and serves a Flex dashboard card. This document covers local development, debugging, and deployment to Render.

### Requirements

- Node.js 20+
- npm
- LINE Channel secret & access token

### Environment Variables

Create `apps/bot/.env.local` (ignored by Git) based on the example:

```
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_ID=
LINE_LOGIN_NONCE_REQUIRED=false
LIFF_ID=
DEBUG_LOCAL=0
DEBUG_TEST_MODE=0
PORT=3000
CORS_ALLOW_ORIGIN=
```

`LINE_CHANNEL_ID` is required for OpenID verification. `LINE_LOGIN_NONCE_REQUIRED` enables strict nonce validation (toggle to `true` only when the frontend provides a nonce). `CORS_ALLOW_ORIGIN` defaults to `*`; override it with your dashboard origin if desired. `LIFF_ID` remains optional; when provided the dashboard button opens the LIFF URL with `userId` and timestamp query parameters. Without it the link defaults to `https://debtwise.app/dashboard`.

### Available Scripts

Run all commands from the repo root.

| Script | Description |
| --- | --- |
| `npm --workspace apps/bot run dev` | Start the bot with Nodemon (local JSON mode by default). |
| `npm --workspace apps/bot run start` | Start once (used by Render). |
| `npm --workspace apps/bot run bot:ngrok` | Launch ngrok tunnel on port 3000. |
| `npm --workspace apps/bot run test` | Run Vitest suite (commands, retry/dedupe, signature route, OpenID verification). |
| `npm --workspace apps/bot run test:debug` | Run tests with `DEBUG_TEST_MODE=1` for raw signature checks. |

### Auth Verification API

- **Endpoint**: `POST /auth/verify`
- **Headers**: `Content-Type: application/json`
- **Body**:
  - `id_token` (string, required)
  - `nonce` (string, optional unless `LINE_LOGIN_NONCE_REQUIRED=true`)
- **Success (200)**:
  - `{ ok: true, user, payload }`
  - `user` includes `{ lineUserId, name, picture, email }`
  - `payload` mirrors the verified ID token claims for downstream usage
- **Failure (401)**: `{ ok: false, error }` where `error` is one of:
  - `TOKEN_MISSING`, `TOKEN_EXPIRED`, `SIGNATURE_INVALID`, `ISSUER_INVALID`, `AUDIENCE_INVALID`, `NONCE_REQUIRED`, `NONCE_MISMATCH`, `ALGORITHM_NOT_ALLOWED`, `MALFORMED_TOKEN`, or `UNKNOWN`

Verification relies on LINE's JWKS endpoint (`https://api.line.me/oauth2/v2.1/certs`) with 10-minute caching, support for key rotation via `kid`, and a ±5 minute clock tolerance for `exp`, `iat`, and `nbf`. Nonce checking is enforced when the environment flag is enabled. Logs redact ID tokens to the first/last 12 characters and emit structured diagnostics for observability.

### Local Debug Flow

1. Export environment variables in one terminal:

   ```bash
   export DEBUG_LOCAL=1
   export LINE_CHANNEL_SECRET='dummy_32_character_secret________'
   export LINE_CHANNEL_ACCESS_TOKEN='dummy_token_for_local_tests'
   npm --workspace apps/bot run dev
   ```

2. In another terminal, craft a signed payload:

   ```bash
   printf '%s' '{"events":[{"replyToken":"test","type":"message","message":{"type":"text","text":"開啟儀表板"}}]}' > body.json
   SIGNATURE=$(openssl dgst -sha256 -hmac "$LINE_CHANNEL_SECRET" -binary body.json | base64 | tr -d '\n')
   curl -v http://localhost:3000/webhook \
     -H "Content-Type: application/json" \
     -H "x-line-signature: $SIGNATURE" \
     --data-binary @body.json
   ```

   Expected logs include JSON lines similar to:

   ```
   {"level":"info","timestamp":"...","scope":"webhook","events":1}
   {"level":"info","timestamp":"...","scope":"event","type":"message","source":"user","mode":"active"}
   {"level":"info","timestamp":"...","scope":"command","cmd":"dashboard","userId":"","dryRun":true}
   {"level":"info","timestamp":"...","scope":"command","cmd":"dashboard","userId":"","ok":true}
   ```

### Command Routing

- `help` / `說明` – lists available commands.
- `dashboard` / `開啟儀表板` – returns a Flex bubble with a button to launch the DebtWise dashboard (LIFF aware).
- Any other message – replies: “我還不懂這句話，輸入 help 查看使用方式。”

### Deployment (Render)

1. Set `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, and `LINE_CHANNEL_ID` in Render. Add `LINE_LOGIN_NONCE_REQUIRED=true` only if the frontend always sends a nonce, otherwise omit it (defaults to `false`). Leave `CORS_ALLOW_ORIGIN` empty to allow all origins or pin it to the dashboard host.
2. Confirm Render logs contain `token.len` and `secret.len` at startup (never the raw values) and that `/health` returns `{ ok: true }`.
3. Run an end-to-end OpenID check: obtain a fresh `id_token` via LIFF, call `/auth/verify`, and ensure `{ ok: true }` with a populated `user`.
4. Connect an ngrok tunnel locally with `npm run bot:ngrok`, update the LINE Developers webhook URL to `https://<subdomain>.ngrok.io/webhook`, and Verify → Success.
5. Send “開啟儀表板” to the bot from LINE; the reply should be the Flex card pointing at LIFF or the default dashboard URL.

### Troubleshooting

- **401 Unauthorized** – token missing or incorrect (startup log shows short lengths). Refresh tokens and redeploy.
- **TOKEN_EXPIRED** – the ID token is outside the allowed clock skew; re-login to obtain a fresh token.
- **NONCE_REQUIRED/NONCE_MISMATCH** – Render is configured to require a nonce but the client omitted or altered it.
- **MALFORMED_TOKEN** – the payload is not a valid JWT; verify the LIFF integration and avoid reusing expired tokens.
- **SignatureValidationFailed** – ensure no body parser runs before the LINE middleware, and verify the secret.
- **No reply while status = 200** – `DEBUG_LOCAL=1` still enabled, or the `replyToken` expired.
- **Duplicate replies** – redelivery dedupe keeps only the first event within 5 minutes; restart the process to clear the cache.

### Continuous Integration

The workflow in `.github/workflows/bot-tests.yml` installs dependencies and runs `npm --workspace apps/bot run test` on push and pull requests. The suite covers command routing, retry/backoff, dedupe logic, and raw signature verification.
