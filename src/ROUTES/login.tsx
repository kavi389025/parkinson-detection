import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAuthRedirectUrl } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { toast } from "sonner";

type LoginSearch = { email?: string; pending?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    email: typeof search.email === "string" ? search.email : undefined,
    pending: typeof search.pending === "string" ? search.pending : undefined,
  }),
  head: () => ({ meta: [{ title: "Log in — NeuroTrack" }] }),
  component: LoginPage,
});

function authErrorMessage(error: { message: string; code?: string }) {
  const code = error.code ?? "";
  if (code === "email_not_confirmed") {
    return "Please confirm your email first. Check your inbox (and spam), then try again.";
  }
  if (code === "invalid_credentials") {
    return "Email or password is incorrect, or your account is not confirmed yet.";
  }
  if (code === "weak_password") {
    return "Password is too weak. Use at least 8 characters with letters and numbers.";
  }
  return error.message;
}

function LoginPage() {
  const navigate = useNavigate();
  const { email: emailFromUrl, pending } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (emailFromUrl) setEmail(emailFromUrl);
  }, [emailFromUrl]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error("Please enter your email.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    setLoading(false);
    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }
    if (!data.session) {
      toast.error("Sign-in did not complete. Confirm your email, then try again.");
      return;
    }
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  }

  async function resendConfirmation() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error("Enter your email above, then click resend.");
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: trimmedEmail,
      options: { emailRedirectTo: getAuthRedirectUrl() },
    });
    setResending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Confirmation email sent. Check your inbox.");
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-semibold">Log in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Continue tracking your motor health.</p>
        {pending === "1" && (
          <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Confirmation email not arriving?</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Check spam/junk for mail from <strong>Supabase</strong> or <strong>noreply@mail.app.supabase.io</strong></li>
              <li>Wait 2–5 minutes, then use <strong>Resend confirmation email</strong> below</li>
              <li>
                Or confirm manually:{" "}
                <a
                  href="https://supabase.com/dashboard/project/pyouczgbsagmanppbsno/auth/users"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  Supabase → Authentication → Users
                </a>
                , open your user, set email as confirmed
              </li>
            </ul>
          </div>
        )}
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading} className="w-full">{loading ? "Signing in…" : "Log in"}</Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          Just signed up?{" "}
          <button
            type="button"
            onClick={resendConfirmation}
            disabled={resending}
            className="text-primary hover:underline disabled:opacity-50"
          >
            {resending ? "Sending…" : "Resend confirmation email"}
          </button>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          No account? <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
        </p>
      </main>
    </div>
  );
}