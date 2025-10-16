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
LIFF_ID=
DEBUG_LOCAL=0
DEBUG_TEST_MODE=0
PORT=3000
```

`LIFF_ID` is optional; when provided the dashboard button opens the LIFF URL with `userId` and timestamp query parameters. Without it the link defaults to `https://debtwise.app/dashboard`.

### Available Scripts

Run all commands from the repo root.

| Script | Description |
| --- | --- |
| `npm --workspace apps/bot run dev` | Start the bot with Nodemon (local JSON mode by default). |
| `npm --workspace apps/bot run start` | Start once (used by Render). |
| `npm --workspace apps/bot run bot:ngrok` | Launch ngrok tunnel on port 3000. |
| `npm --workspace apps/bot run test` | Run Vitest suite (commands, retry/dedupe, signature route). |
| `npm --workspace apps/bot run test:debug` | Run tests with `DEBUG_TEST_MODE=1` for raw signature checks. |

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

1. Set `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, and optional `LIFF_ID` in Render environment variables.
2. Confirm Render logs contain `token.len` and `secret.len` at startup (never the raw values).
3. Connect an ngrok tunnel locally with `npm run bot:ngrok`, update the LINE Developers webhook URL to `https://<subdomain>.ngrok.io/webhook`, and Verify → Success.
4. Send “開啟儀表板” to the bot from LINE; the reply should be the Flex card pointing at LIFF or the default dashboard URL.

### Troubleshooting

- **401 Unauthorized** – token missing or incorrect (startup log shows short lengths). Refresh tokens and redeploy.
- **SignatureValidationFailed** – ensure no body parser runs before the LINE middleware, and verify the secret.
- **No reply while status = 200** – `DEBUG_LOCAL=1` still enabled, or the `replyToken` expired.
- **Duplicate replies** – redelivery dedupe keeps only the first event within 5 minutes; restart the process to clear the cache.

### Continuous Integration

The workflow in `.github/workflows/bot-tests.yml` installs dependencies and runs `npm --workspace apps/bot run test` on push and pull requests. The suite covers command routing, retry/backoff, dedupe logic, and raw signature verification.
