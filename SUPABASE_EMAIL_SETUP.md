# Fix confirmation emails (Supabase)

Your app uses Supabase project: **pyouczgbsagmanppbsno**

## 1. Allow localhost redirects (required)

Open: https://supabase.com/dashboard/project/pyouczgbsagmanppbsno/auth/url-configuration

Set **Site URL** to:

```
http://localhost:8080
```

Under **Redirect URLs**, add:

```
http://localhost:8080/**
http://localhost:8080/auth/callback
```

Click **Save**.

## 2. Confirm your account manually (fastest — no email needed)

1. Open: https://supabase.com/dashboard/project/pyouczgbsagmanppbsno/auth/users
2. Find your email in the list
3. Click the user → confirm / verify email (or toggle **Email confirmed**)
4. Log in at http://localhost:8080/login

## 3. Stop requiring email confirmation (local development)

1. Open: https://supabase.com/dashboard/project/pyouczgbsagmanppbsno/auth/providers
2. Click **Email**
3. Turn **OFF** “Confirm email”
4. Save

New signups can log in immediately without a confirmation email.

## 4. Why emails often don’t arrive

- Supabase free tier sends from `noreply@mail.app.supabase.io` — often goes to **spam**
- Rate limit (~few emails per hour per project)
- Wrong redirect URLs block or break the confirmation link
- School/corporate email filters block automated mail

Use a personal Gmail/Outlook for testing.
