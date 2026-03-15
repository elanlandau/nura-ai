# Real Google OAuth Integration Summary

## ✅ What's Been Updated

### Mock → Real Integration Changes

| Component | Before | After |
|-----------|--------|-------|
| **Connection Flow** | Mock data insertion | Real OAuth 2.0 flow with Google |
| **Calendar API** | Fake time slots | Real Google Calendar API calls |
| **Gmail API** | Console logs only | Real email sending via Gmail |
| **Token Management** | Static mock tokens | Auto-refreshing OAuth tokens |
| **User Authentication** | N/A | Secure token storage in Supabase |

## 📁 New Files Created

### 1. OAuth Routes
- `app/api/auth/google/route.ts` - Initiates OAuth flow
- `app/api/auth/callback/google/route.ts` - Handles OAuth callback

### 2. Google Integration Files
- `lib/integrations/google-calendar.ts` - Real Calendar API
- `lib/integrations/gmail.ts` - Real Gmail API
- `lib/integrations/microsoft-calendar.ts` - Placeholder for MS

### 3. Documentation
- `GOOGLE_OAUTH_SETUP.md` - Complete setup guide
- `QUICK_START.md` - Fast reference
- `.env.example` - Template with all required vars

## 🔧 Files Modified

### 1. `app/connections/page.tsx`
**Changed:** `handleGoogleConnect()` function
```typescript
// BEFORE: Mock data insertion
const mockAccount = { /* mock data */ };
await supabase.from('oauth_accounts').insert(mockAccount);

// AFTER: Real OAuth redirect
window.location.href = `/api/auth/google?state=${user.id}`;
```

### 2. `lib/integrations/calendar.ts`
**Changed:** Import real Google Calendar functions
```typescript
// BEFORE: Local mock implementation
async function getGoogleCalendarAvailability() { /* mock */ }

// AFTER: Import from dedicated file
import { getGoogleCalendarAvailability } from './google-calendar';
```

### 3. `lib/integrations/email.ts`
**Changed:** Import real Gmail functions
```typescript
// BEFORE: Console.log only
console.log('Sending Gmail message:', params);

// AFTER: Real Gmail API call
import { sendGmailMessage } from './gmail';
```

### 4. `.env`
**Added:** OAuth credentials section
```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
```

## 🔐 Security Implementation

### OAuth 2.0 Flow
```
1. User clicks "Connect" → Redirect to /api/auth/google
2. Server generates Google OAuth URL with scopes
3. User redirected to Google consent screen
4. User grants permissions
5. Google redirects back to /api/auth/callback/google
6. Server exchanges code for access + refresh tokens
7. Tokens stored in Supabase (encrypted via RLS)
8. User redirected to /connections with success message
```

### Token Refresh Strategy
```typescript
async function ensureValidToken(account: OAuthAccount): Promise<string> {
  const now = Date.now();
  const expiresAt = account.expires_at * 1000;

  // Refresh 1 minute before expiry
  if (now >= expiresAt - 60000) {
    const tokenData = await refreshGoogleAccessToken(account.refresh_token);
    return tokenData.access_token;
  }

  return account.access_token;
}
```

## 📊 API Scopes Requested

### Google Scopes
- `https://www.googleapis.com/auth/calendar` - Read/write calendar events
- `https://www.googleapis.com/auth/gmail.send` - Send emails
- `https://www.googleapis.com/auth/userinfo.email` - Get user email

### What Each Allows
1. **Calendar Scope**
   - Read user's calendar events
   - Check availability (busy/free)
   - Create new calendar events
   - Add attendees to events

2. **Gmail Scope**
   - Send emails from user's account
   - Draft meeting proposals
   - Send calendar invitations

3. **UserInfo Scope**
   - Get user's email address
   - Display in connection card

## 🚀 API Integration Details

### Google Calendar API Calls

**1. Get Availability**
```http
GET https://www.googleapis.com/calendar/v3/calendars/primary/events
Authorization: Bearer {access_token}
Query Parameters:
  - timeMin: 2024-01-01T00:00:00Z
  - timeMax: 2024-01-07T23:59:59Z
  - singleEvents: true
```

**2. Create Event**
```http
POST https://www.googleapis.com/calendar/v3/calendars/primary/events
Authorization: Bearer {access_token}
Body: {
  summary: "Meeting Title",
  start: { dateTime, timeZone },
  end: { dateTime, timeZone },
  attendees: [{ email }]
}
```

### Gmail API Calls

**Send Email**
```http
POST https://www.googleapis.com/gmail/v1/users/me/messages/send
Authorization: Bearer {access_token}
Body: {
  raw: base64EncodedEmail
}
```

## 🔄 Data Flow

### When User Connects Google Account
```
User → React Component → OAuth Route → Google →
Callback Route → Store Tokens → Supabase → Update UI
```

### When AI Checks Calendar
```
AI Agent → Function Call → calendar.ts → google-calendar.ts →
Check Token → Refresh if Needed → Google Calendar API →
Parse Response → Return Availability → AI Response
```

### When AI Sends Email
```
AI Agent → Function Call → email.ts → gmail.ts →
Check Token → Refresh if Needed → Gmail API →
Send Email → Return Thread ID → AI Confirmation
```

## 📦 Database Schema

### oauth_accounts Table
```sql
CREATE TABLE oauth_accounts (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  provider text CHECK (provider IN ('google', 'microsoft')),
  provider_account_id text,
  access_token text,           -- Short-lived (1 hour)
  refresh_token text,          -- Long-lived
  expires_at bigint,           -- Unix timestamp
  token_type text,             -- "Bearer"
  scope text,                  -- Space-separated scopes
  email text,                  -- User's email
  created_at timestamptz,
  updated_at timestamptz,
  UNIQUE(user_id, provider)
);
```

## ⚙️ Configuration Checklist

- [ ] Get Google Client ID from Cloud Console
- [ ] Get Google Client Secret from Cloud Console
- [ ] Add credentials to `.env` file
- [ ] Add redirect URI to Google Cloud Console
- [ ] Enable Google Calendar API
- [ ] Enable Gmail API
- [ ] Configure OAuth consent screen
- [ ] Add test users (for testing mode)
- [ ] Restart development server
- [ ] Test OAuth flow
- [ ] Test calendar availability
- [ ] Test email sending

## 🎯 Next Steps

1. **Add Your Credentials**
   - Open `.env`
   - Replace `GOOGLE_CLIENT_ID` with your actual ID
   - Replace `GOOGLE_CLIENT_SECRET` with your actual secret

2. **Test the Integration**
   - Run `npm run dev`
   - Go to Connections page
   - Click Connect on Google
   - Grant permissions
   - Try AI commands

3. **Production Deployment**
   - Update redirect URI for production domain
   - Add production URI to Google Cloud Console
   - Set environment variables in hosting platform
   - Submit app for verification (if needed)

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Calendar API Reference](https://developers.google.com/calendar/api/v3/reference)
- [Gmail API Reference](https://developers.google.com/gmail/api/reference/rest)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)

---

**Everything is ready! Just add your Google OAuth credentials and you're live with real integration.**
