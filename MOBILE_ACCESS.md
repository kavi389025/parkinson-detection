# Use NeuroTrack on iPhone & Android

This app is a **Progressive Web App (PWA)**. Install it on your phone like an app—no App Store required.

## Step 1: Run or deploy with HTTPS

**Camera tests require HTTPS** (except `localhost` on the same device).

### Local testing (same Wi‑Fi)

```powershell
cd d:\Parkinson
npm run dev
```

On your phone browser, open the **Network** URL from the terminal, e.g.:

`http://192.168.x.x:8080`

(PC and phone must be on the same Wi‑Fi.)

### Production (recommended for phones)

Deploy via **Lovable Publish** or **Cloudflare** so you get `https://your-app.pages.dev`.

Add that URL in Supabase → **Authentication → URL Configuration** → Redirect URLs.

## Step 2: Install on the home screen

### iPhone (Safari)

1. Open the app URL in **Safari** (not Chrome).
2. Tap **Share** (square with arrow).
3. Tap **Add to Home Screen**.
4. Open **NeuroTrack** from your home screen.

### Android (Chrome)

1. Open the app URL in **Chrome**.
2. Tap **Install app** in the banner, or menu **⋮** → **Install app** / **Add to Home screen**.

## Step 3: Allow camera

For tremor and rigidity tests, when prompted tap **Allow** camera access.

## Supabase mobile URLs

In [Supabase URL Configuration](https://supabase.com/dashboard/project/pyouczgbsagmanppbsno/auth/url-configuration), add:

```
https://YOUR-DEPLOYED-URL/**
https://YOUR-DEPLOYED-URL/auth/callback
```

For local Wi‑Fi testing also add:

```
http://192.168.x.x:8080/**
http://192.168.x.x:8080/auth/callback
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Can't open on phone | Same Wi‑Fi; use Network IP from `npm run dev` |
| Camera blocked | Use HTTPS deploy; allow camera in browser settings |
| Login fails after email link | Add redirect URLs in Supabase |
| No install prompt | Use Safari (iOS) or Chrome (Android); add to home screen manually |
