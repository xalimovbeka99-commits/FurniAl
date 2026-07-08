# Google Sign-In setup (Supabase + Google Cloud)

Two dashboards, ~5 minutes total.

## 1. Google Cloud Console

1. Go to https://console.cloud.google.com/ → create a new project (or pick an existing one)
2. **APIs & Services → OAuth consent screen** → choose **External** → fill in app name ("FurniAI"), your email → save through the steps (scopes/test users can stay default)
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: "FurniAI"
   - Authorized redirect URIs — add this exact URL (from your Supabase project's API settings page, or use the pattern below):
     ```
     https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback
     ```
4. Click Create — you'll get a **Client ID** and **Client Secret**. Keep this tab open.

## 2. Supabase Dashboard

1. Go to your project → **Authentication → Providers → Google**
2. Toggle it **on**
3. Paste in the **Client ID** and **Client Secret** from step 1
4. Save

## 3. Add your site URL

Still in Supabase: **Authentication → URL Configuration**
- Site URL: `https://furnia.vercel.app`
- Redirect URLs: add `https://furnia.vercel.app/**` (and `http://localhost:8001/**` if you want Google sign-in to work on the local dev server too)

That's it — email/password sign-in needs no extra setup, Supabase handles it automatically once the project exists.
