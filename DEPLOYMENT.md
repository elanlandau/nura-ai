# NURA – Deploy to Vercel

This guide gets NURA running on a production URL (no localhost).

---

## 1. Production URL

The app is already set up to work with a production URL:

- **Sign-in (Supabase OAuth)** uses `window.location.origin`, so redirect after login works on your live domain.
- **Google OAuth (Connections)** uses `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` if set; otherwise it uses **Vercel’s `VERCEL_URL`** so on Vercel the redirect URI is `https://<your-project>.vercel.app/api/auth/callback/google` without extra config. For a **custom domain**, set `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` (see below).

---

## 2. Environment Variables (Vercel Dashboard)

In **Vercel → Your Project → Settings → Environment Variables**, add these for **Production** (and Preview if you want):

| Key | Required | Notes |
|-----|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only) |
| `DATABASE_URL` | Yes | **Production DB only.** Not `file:./dev.db`. Use a hosted Postgres URL (e.g. Supabase Postgres, Neon) or Turso (SQLite). Run migrations before first deploy. |
| `OPENAI_API_KEY` | Yes | From [OpenAI API keys](https://platform.openai.com/api-keys) |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` | Optional* | See below. On Vercel with default URL you can omit; set for custom domain. |
| `CRON_SECRET` | Yes for cron | Secret for securing the daily cron. Vercel will send it as `Authorization: Bearer <CRON_SECRET>`. |

Optional / if you use them:

- `NEXTAUTH_URL` – Set to your production URL (e.g. `https://your-app.vercel.app`) if you use NextAuth elsewhere.
- `NEXTAUTH_SECRET` – Same as local if needed.
- `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` / `NEXT_PUBLIC_MICROSOFT_REDIRECT_URI` – Only if you enable Microsoft OAuth.

\* **Redirect URI:** If you use the default Vercel URL, the app derives the callback from `VERCEL_URL`. If you use a **custom domain**, set:

`NEXT_PUBLIC_GOOGLE_REDIRECT_URI=https://<your-custom-domain>/api/auth/callback/google`

---

## 3. Redirect URIs to Update (Sign-in works from live site)

### Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. Edit your **OAuth 2.0 Client ID** (Web application).
3. Under **Authorized redirect URIs**, add:
   - **Production:** `https://<your-production-domain>/api/auth/callback/google`  
     Examples:
     - `https://your-app.vercel.app/api/auth/callback/google`
     - `https://nura.yourdomain.com/api/auth/callback/google`
4. Under **Authorized JavaScript origins** (if required), add:
   - `https://<your-production-domain>` (e.g. `https://your-app.vercel.app`).
5. Save.

### Supabase Dashboard

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **URL Configuration**.
2. Set **Site URL** to your production URL, e.g. `https://your-app.vercel.app`.
3. Under **Redirect URLs**, add:
   - `https://<your-production-domain>/`
   - `https://<your-production-domain>/**`  
   (or the exact paths you use after login.)
4. Save.

After this, “Sign in with Google” and Supabase auth will work from the live site.

---

## 4. Vercel Config & Cron (daily background scans)

`vercel.json` is set up for the NURA Pulse cron. **Hobby accounts only support daily crons**, so the schedule runs once per day:

```json
{
  "crons": [
    {
      "path": "/api/cron/scan-workspace",
      "schedule": "0 0 * * *"
    }
  ]
}
```

- **Schedule:** `0 0 * * *` = once daily at midnight UTC.
- **Path:** `GET` or `POST` to `/api/cron/scan-workspace` runs the workspace scan (Gmail, notifications).

To secure the cron:

1. In Vercel → **Settings → Environment Variables**, add **`CRON_SECRET`** (e.g. a long random string).
2. Vercel Cron will send it as `Authorization: Bearer <CRON_SECRET>` when it hits the cron endpoint. The app already checks this and returns 401 if the secret is wrong or missing.

No changes to `vercel.json` are required for cron to run; just set `CRON_SECRET` in the Vercel dashboard.

---

## 5. Database for Production

Vercel is serverless; a local `file:./dev.db` is not used in production.

- **Option A – Supabase Postgres:** Use the same Supabase project’s Postgres connection string as `DATABASE_URL`. Switch Prisma to the `postgresql` provider and run migrations.
- **Option B – Neon / other Postgres:** Create a database, get the connection string, set `DATABASE_URL`, run migrations.
- **Option C – Turso (SQLite):** Use Turso’s connection string and Prisma’s Turso adapter if you keep SQLite.

Ensure migrations have been run against the production DB before or right after the first deploy.

---

## 6. Quick checklist

- [ ] All env vars above set in Vercel (Production, and Preview if needed).
- [ ] Google Cloud: redirect URI and origins include your production URL.
- [ ] Supabase: Site URL and Redirect URLs include your production URL.
- [ ] `DATABASE_URL` points to a hosted DB; migrations applied.
- [ ] `CRON_SECRET` set so the daily cron is authenticated.
- [ ] Deploy from Vercel (git push or Vercel CLI); test sign-in and Google connection from the live URL.
