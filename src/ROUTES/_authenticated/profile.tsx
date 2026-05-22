import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — NeuroTrack" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const [form, setForm] = useState({ name: "", age: "", gender: "", patient_id: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (data) setForm({ name: data.name, age: String(data.age ?? ""), gender: data.gender ?? "", patient_id: data.patient_id });
    setLoading(false);
  })(); }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update({
      name: form.name,
      age: form.age ? Number(form.age) : null,
      gender: form.gender || null,
    }).eq("id", user.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated");
  }

  if (loading) return <main className="mx-auto max-w-md px-4 py-8 text-sm text-muted-foreground">Loading…</main>;

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-2xl font-semibold">Patient profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">Patient ID: <span className="font-mono">{form.patient_id}</span></p>
      <form onSubmit={onSave} className="mt-6 space-y-4">
        <div className="space-y-1">
          <Label>Name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Age</Label>
            <Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Gender</Label>
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">—</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <Button type="submit" className="w-full">Save</Button>
      </form>
    </main>
  );
}