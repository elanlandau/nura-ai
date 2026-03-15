# NURA App – Diagnostic Report (for Gemini)

**Date:** 2026-03-14  
**Symptom:** App loads in guest mode at nurapersonal.com but AI chat does not respond; features feel "stuck."

---

## 1. API connection (OPENAI_API_KEY)

- **Backend reads the key:** Yes. `OPENAI_API_KEY` is loaded from `.env` and passed to `openai-edge` in `app/api/chat/route.ts` (line 8–9).
- **What actually fails:** OpenAI’s API returns **401 Unauthorized** with:
  - `"Incorrect API key provided"`
  - `"code": "invalid_api_key"`
  - `"type": "invalid_request_error"`
- **Conclusion:** The key in `.env` is being sent but **OpenAI is rejecting it** (expired, revoked, or invalid). The app needs a **new, valid key** from https://platform.openai.com/api-keys and `.env` updated with it.
- **Fix applied:** The chat API route now checks `response.ok` before streaming and returns a clear JSON error on 401/503 so the UI can show “Invalid API key” instead of hanging, and so the server doesn’t hit `ERR_HTTP_HEADERS_SENT`.

---

## 2. Database state (SQLite vs Supabase)

- **Prisma + SQLite:** Prisma is configured for **SQLite** (`provider = "sqlite"`, `url = "file:./dev.db"` in `prisma/schema.prisma`). `npx prisma generate` and `npx prisma db push` use this. **Prisma is not trying to reach Supabase.**
- **App code still uses Supabase for data:** The **chat API** (`app/api/chat/route.ts`) does **not** use Prisma. It uses **`supabaseAdmin`** (from `lib/supabase/server.ts`) for:
  - `oauth_accounts` (Google/Microsoft tokens)
  - `meeting_threads`
- **Implication:** “Switching to SQLite” only changed **Prisma’s** database. Auth, OAuth storage, and meeting threads are still **Supabase**. So:
  - **Plain chat (no tools):** Only OpenAI is used; failing because of the invalid API key above.
  - **Calendar/email tools:** When the AI calls `get_calendar_availability`, `propose_meeting_slots`, or `confirm_meeting`, the backend queries **Supabase** `oauth_accounts` and `meeting_threads`. If Supabase is unreachable or tables are missing, those tools will fail.

---

## 3. Google auth and “Sign in (optional)”

- **Why “Sign in” is optional:** To unblock the UI when Supabase was slow/unreachable, the app was changed to **bypass** the session check: when there is no Supabase user, it still shows the dashboard and chat in **guest mode** (`userId = 'guest-user-bypass'`). The “Sign in (optional)” card is intentional so users can optionally sign in.
- **Google token and guest:** In guest mode there is **no** Google (or any) token. Google OAuth is only used when:
  1. User signs in with Supabase (email/password),
  2. Then goes to Connections and clicks “Connect” for Google,
  3. Tokens are stored in **Supabase** `oauth_accounts`.
- So for a **guest** session, no Google token is passed or expected. Calendar/email tools will report “No google account connected” for guest.

---

## 4. Terminal errors observed

- **401 Unauthorized:** From OpenAI: “Incorrect API key provided” (see section 1).
- **ERR_HTTP_HEADERS_SENT:** Occurred because the chat route started streaming and then tried to send an error response after the response had already started. The fix is to **avoid starting the stream** when the OpenAI response is not OK (see section 1).
- **Watchpack EMFILE:** “Too many open files” – system limit on file watchers; not related to the stuck AI.
- **Supabase RealtimeClient warning:** “Critical dependency: the request of a dependency is an expression” – build-time warning from `@supabase/realtime-js`; does not explain the missing AI replies.

---

## 5. Summary – what is broken

| Item | Status | Action |
|------|--------|--------|
| **OPENAI_API_KEY** | Key is read but **rejected by OpenAI** (401 invalid_api_key) | Replace with a **valid** key from https://platform.openai.com/api-keys and update `.env`. Restart dev server. |
| **Chat API error handling** | Fixed | Route now returns a clear JSON error on invalid key and avoids ERR_HTTP_HEADERS_SENT. |
| **Prisma / SQLite** | OK | Prisma uses SQLite (`dev.db`); no Supabase used by Prisma. |
| **Supabase usage in app** | Still in use | Chat route and calendar/email tools use **Supabase** for `oauth_accounts` and `meeting_threads`, not Prisma. |
| **Guest mode / “Sign in optional”** | By design | Guest has no Google token; optional sign-in is intentional. |
| **Why AI is “stuck”** | OpenAI 401 | Every chat request fails with “Incorrect API key”; user sees no reply. Fix by updating `OPENAI_API_KEY`. |

---

## 6. Immediate action for you

1. **Get a new OpenAI API key** from https://platform.openai.com/api-keys (create or rotate if the current one was exposed).
2. **Update `.env`:** set `OPENAI_API_KEY=<new_key>` (no quotes, no spaces).
3. **Restart the dev server:** e.g. `npm run dev -- -p 3001`.
4. **Test chat again** at http://nurapersonal.com; if the key is valid, the AI should respond and the “stuck” behavior should stop.

If you later want calendar/email tools to work without Supabase, the backend would need to be changed to use **Prisma + SQLite** (or another local store) for `oauth_accounts` and `meeting_threads` instead of Supabase.
