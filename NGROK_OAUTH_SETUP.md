# Ngrok OAuth Setup Guide

When hosting your frontend on ngrok, you need to configure OAuth redirect URLs in both Google Cloud Console and Supabase.

## Step 1: Get Your Ngrok Frontend URL

1. Start your frontend: `npm run dev`
2. In another terminal, start ngrok: `ngrok http 8080`
3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.app`)

## Step 2: Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID and click **Edit**
4. Under **Authorized redirect URIs**, add:
   - `https://abc123.ngrok.app/auth/callback` (replace with your ngrok URL)
5. Under **Authorized JavaScript origins**, add:
   - `https://abc123.ngrok.app` (replace with your ngrok URL)
6. Click **Save**

## Step 3: Update Supabase Configuration

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. Under **Redirect URLs**, add:
   - `https://abc123.ngrok.app/auth/callback` (replace with your ngrok URL)
5. Update **Site URL** to:
   - `https://abc123.ngrok.app` (replace with your ngrok URL)
6. Click **Save**

## Step 4: Test

1. Access your frontend via the ngrok URL
2. Click "Sign in with Google"
3. You should be redirected to Google's consent screen
4. After authorizing, you should be redirected back to your ngrok URL

## Important Notes

- **Ngrok URLs change**: If you restart ngrok, you'll get a new URL and need to update the configurations again
- **Use ngrok paid plan**: Free ngrok URLs change on restart. Consider ngrok's paid plan for a static URL
- **HTTPS required**: OAuth requires HTTPS, which ngrok provides automatically
- **Both URLs needed**: You need to add the redirect URL in BOTH Google Cloud Console AND Supabase

## Troubleshooting

### "redirect_uri_mismatch" error
- Make sure the redirect URI in Google Cloud Console exactly matches: `https://your-ngrok-url.ngrok.app/auth/callback`
- Check that it's added in Supabase Redirect URLs as well

### "localhost refused to connect"
- This happens when the redirect URL is still pointing to localhost
- Make sure you've updated both Google Cloud Console and Supabase with the ngrok URL
- Clear browser cache and try again

### Session not created after OAuth
- Check browser console for errors
- Verify the callback URL is accessible: `https://your-ngrok-url.ngrok.app/auth/callback`
- Make sure Supabase Site URL matches your ngrok URL

