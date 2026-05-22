import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getAuthRedirectUrl } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — NeuroTrack" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", name: "", age: "", gender: "" });
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = form.email.trim();
    if (!trimmedEmail) {
      toast.error("Please enter a valid email.");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    const patient_id = "P-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: form.password,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
        data: {
          patient_id,
          name: form.name,
          age: form.age,
          gender: form.gender,
        },
      },
    });
    setLoading(false);
    if (error) {
      const msg =
        error.code === "weak_password"
          ? "Password is too weak or too common. Use at least 8 characters with letters, numbers, and symbols."
          : error.message;
      toast.error(msg);
      return;
    }

    const needsConfirmation = data.user && !data.session;
    if (needsConfirmation) {
      toast.success(
        `Account created (Patient ID: ${patient_id}). We sent a confirmation link to ${trimmedEmail}. Check inbox and spam.`,
        { duration: 10000 },
      );
      navigate({ to: "/login", search: { email: trimmedEmail, pending: "1" } });
      return;
    }

    toast.success(`Account created. Patient ID: ${patient_id}`);
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-semibold">Create patient profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A unique Patient ID will be assigned automatically. You must confirm your email before logging in.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="age">Age</Label>
              <Input id="age" type="number" min={1} max={120} required value={form.age} onChange={(e) => set("age", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gender">Gender</Label>
              <select id="gender" required value={form.gender} onChange={(e) => set("gender", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Select…</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" minLength={6} required value={form.password} onChange={(e) => set("password", e.target.value)} />
          </div>
          <Button type="submit" disabled={loading} className="w-full">{loading ? "Creating account…" : "Create account"}</Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          Already registered? <Link to="/login" className="text-primary hover:underline">Log in</Link>
        </p>
      </main>
    </div>
  );
}