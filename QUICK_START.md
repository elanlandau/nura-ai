# NURA - Quick Start Guide

## Where to Add Your Google Credentials

### 1. Open your `.env` file and replace these lines:

**BEFORE:**
```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**AFTER:**
```bash
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_actual_secret_here
```

### 2. That's it! The credentials are already wired up.

## What Changed From Mock to Real Integration

### Files Now Using Real Google APIs:

1. **`lib/integrations/google-calendar.ts`** ✅
   - Real Google Calendar API calls
   - Fetches actual availability from your calendar
   - Creates real calendar events
   - Automatic token refresh

2. **`lib/integrations/gmail.ts`** ✅
   - Real Gmail API calls
   - Sends actual emails through your Gmail
   - Formats meeting proposals

3. **`app/api/auth/google/route.ts`** ✅
   - Initiates OAuth flow with Google
   - Redirects to Google consent screen

4. **`app/api/auth/callback/google/route.ts`** ✅
   - Handles OAuth callback
   - Exchanges code for tokens
   - Stores tokens securely in Supabase

5. **`app/connections/page.tsx`** ✅
   - Updated to use real OAuth flow
   - No more mock data

## How It Works Now

### When User Clicks "Connect" on Google:

```
User → /api/auth/google → Google OAuth → User Grants Permission →
/api/auth/callback/google → Stores Tokens in Supabase → Redirects to /connections
```

### When AI Uses Calendar:

```
AI Function Call → getCalendarAvailability() →
Checks Token Expiry → Auto-Refreshes if Needed →
Calls Google Calendar API → Returns Real Availability
```

### When AI Sends Email:

```
AI Function Call → sendGmailMessage() →
Checks Token Expiry → Auto-Refreshes if Needed →
Calls Gmail API → Sends Real Email
```

## Testing After Setup

1. **Add your credentials to `.env`**
2. **Restart the dev server:** `npm run dev`
3. **Go to:** `https://nura-ai.vercel.app`
4. **Sign in/Sign up**
5. **Navigate to Connections page**
6. **Click "Connect" on Google card**
7. **Grant permissions**
8. **You should see:** "Connected as: your@email.com"

## Example AI Commands That Now Work With Real Data

- "What's my availability next week?"
- "Check my calendar for tomorrow"
- "Propose meeting times to john@example.com next Tuesday"
- "Send Sarah 3 time options for our meeting"
- "Create a meeting with Mike tomorrow at 2 PM"

## Environment Variables Reference

```bash
# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://gyzjlftvyjzawcryorej.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=placeholder-service-role-key

# OpenAI (add your key)
OPENAI_API_KEY=sk-your-real-openai-key

# Google OAuth (add your credentials)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=https://nura-ai.vercel.app/api/auth/callback/google
```

## Security Features Implemented

✅ OAuth 2.0 with refresh tokens
✅ Tokens stored in Supabase with Row Level Security
✅ Automatic token refresh before expiry
✅ Secure API calls with Bearer authentication
✅ No credentials exposed to frontend
✅ State parameter prevents CSRF attacks

## Architecture Overview

```
Frontend (React)
    ↓
Supabase Auth (User Management)
    ↓
Connections Page → OAuth Flow → Google
    ↓
Chat Interface → AI Agent (OpenAI GPT-4)
    ↓
Function Calling (Tools)
    ↓
Google APIs (Calendar + Gmail)
```

## Need More Details?

See `GOOGLE_OAUTH_SETUP.md` for the complete step-by-step guide to set up your Google Cloud project.

---

**You're ready to go! Just add your credentials and start using NURA with real Google integration.**
