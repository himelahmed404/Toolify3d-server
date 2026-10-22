# Deploy API on Render

## Create the service

1. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Web Service**.
2. Connect GitHub repo `0xW1zard/Toolify3d-server`.
3. Settings:
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Health check path:** `/health`
4. Or use Blueprint: open this repo’s `render.yaml` via **New → Blueprint**.

## Environment variables

Copy from `.env.example`. Required at minimum:

- `MONGO_URI`
- `JWT_SECRET`
- `BETTER_AUTH_URL` — after frontends exist: `https://<store>,https://<admin>`
- `CLIENT_URL` — same two origins (CORS + Socket.IO)
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_SERVICE_ACCOUNT_JSON` — paste the full service-account JSON as a single env value (not a file path)

Optional but recommended for production emails: all `SMTP_*` and contact/order address vars.

`PORT` is injected by Render — do not hardcode it in the dashboard unless you know you need to.

## After Vercel URLs exist

1. Set `CLIENT_URL` and `BETTER_AUTH_URL` to both production frontend origins (comma-separated, no spaces preferred or trimmed).
2. Manual Deploy → clear build cache if CORS still fails.
3. Verify:
   ```bash
   curl -s https://<your-service>.onrender.com/health
   ```

## Notes

- Free tier spins down; Socket.IO from admin will fail while asleep. Use **Starter** or higher for realtime.
- Do not deploy this Express app to Vercel serverless.
- Never upload `fireBase.json` to Render disk; use `FIREBASE_SERVICE_ACCOUNT_JSON`.
