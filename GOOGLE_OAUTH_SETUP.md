# Google OAuth Setup Guide for NURA

This guide will walk you through setting up real Google OAuth integration for NURA.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "NURA" and click "Create"

## Step 2: Enable Required APIs

1. In your project, go to "APIs & Services" → "Library"
2. Search for and enable these APIs:
   - **Google Calendar API**
   - **Gmail API**
   - **Google+ API** (for user info)

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" and click "Create"
3. Fill in the required fields:
   - **App name**: NURA
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Click "Save and Continue"
5. On the "Scopes" page, click "Add or Remove Scopes" and add:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/userinfo.email`
6. Click "Save and Continue"
7. Add test users (your email) for testing
8. Click "Save and Continue" and then "Back to Dashboard"

## Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Web application"
4. Name it "NURA Web Client"
5. Add Authorized redirect URIs:
   - For local development: `https://nurapersonal.com/api/auth/callback/google`
   - For production: `https://yourdomain.com/api/auth/callback/google`
6. Click "Create"
7. **Copy your Client ID and Client Secret** - you'll need these next!

## Step 5: Update Your .env File

Open your `.env` file and replace the placeholder values:

```bash
# Replace these with your actual credentials:
GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret

# For local development:
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=https://nurapersonal.com/api/auth/callback/google

# For production, update to:
# NEXT_PUBLIC_GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/callback/google
```

## Step 6: Test the Integration

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `https://nurapersonal.com`
3. Sign in or sign up
4. Go to the "Connections" page
5. Click "Connect" on the Google card
6. You should be redirected to Google's OAuth consent screen
7. Grant the requested permissions
8. You'll be redirected back to NURA with your account connected!

## Step 7: Test the AI Features

Now you can test the AI scheduling features:

1. Go back to the Chat interface
2. Try these commands:
   - "Check my calendar availability for the next 7 days"
   - "Propose meeting times to john@example.com"
   - "Create a meeting with Sarah for tomorrow at 2 PM"

The AI will now use your real Google Calendar and Gmail!

## Troubleshooting

### "Error 400: redirect_uri_mismatch"
- Make sure the redirect URI in your .env exactly matches what you added in Google Cloud Console
- Check for trailing slashes - they must match exactly

### "Access blocked: This app's request is invalid"
- Make sure all three required scopes are added in the OAuth consent screen
- Check that the APIs are enabled in Google Cloud Console

### "Token has been expired or revoked"
- The refresh token functionality will automatically handle this
- If issues persist, disconnect and reconnect your Google account

### "Gmail API has not been used in project"
- Go to Google Cloud Console and enable the Gmail API
- Wait a few minutes for it to propagate

## Production Deployment

Before deploying to production:

1. Update the redirect URI in your `.env`:
   ```bash
   NEXT_PUBLIC_GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/callback/google
   ```

2. Add the production redirect URI in Google Cloud Console:
   - Go to "APIs & Services" → "Credentials"
   - Edit your OAuth 2.0 Client ID
   - Add the production URI to "Authorized redirect URIs"

3. Submit your app for verification (if needed):
   - Apps in testing mode are limited to 100 users
   - For public use, you'll need to verify your app with Google
   - Go to "OAuth consent screen" → "Publish App"

## Security Notes

- Never commit your `.env` file to version control
- Keep your Client Secret secure
- Use environment variables for all sensitive data
- The refresh token is stored securely in Supabase with RLS enabled
- Tokens are automatically refreshed when they expire

## What's Implemented

✅ OAuth 2.0 flow with refresh token support
✅ Automatic token refresh when expired
✅ Real Google Calendar API integration
✅ Real Gmail API integration for sending emails
✅ Secure token storage in Supabase
✅ Calendar availability checking
✅ Meeting proposal emails
✅ Calendar event creation

## File Structure

```
lib/integrations/
├── google-calendar.ts    # Google Calendar API calls
├── gmail.ts             # Gmail API calls
├── calendar.ts          # Main calendar interface
└── email.ts             # Main email interface

app/api/auth/
├── google/route.ts                 # Initiates OAuth flow
└── callback/google/route.ts        # Handles OAuth callback
```

Your NURA assistant is now fully integrated with Google services!
