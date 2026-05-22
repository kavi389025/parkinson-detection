import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Hand, Video, Brain, FileDown, ArrowRight } from "lucide-react";
import { compositeScore, severityColor, type Severity } from "@/lib/scoring";
import { Disclaimer } from "@/components/Disclaimer";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { generatePdfReport } from "@/lib/pdfReport";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — NeuroTrack" }] }),
  component: Dashboard,
});

interface Latest { brady: number | null; tremor: number | null; rigidity: number | null; }
interface Profile { name: string; patient_id: string; age: number | null; gender: string | null; }

function Dashboard() {
  const [latest, setLatest] = useState<Latest>({ brady: null, tremor: null, rigidity: null });
  const [history, setHistory] = useState<{ date: string; score: number }[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: p }, b, t, r, preds] = await Promise.all([
        supabase.from("profiles").select("name,patient_id,age,gender").eq("id", user.id).single(),
        supabase.from("bradykinesia_data").select("score,created_at").order("created_at", { ascending: false }).limit(1),
        supabase.from("tremor_data").select("score,created_at").order("created_at", { ascending: false }).limit(1),
        supabase.from("rigidity_data").select("score,created_at").order("created_at", { ascending: false }).limit(1),
        supabase.from("prediction_data").select("composite_score,created_at").order("created_at", { ascending: true }).limit(20),
      ]);
      setProfile(p as Profile | null);
      setLatest({
        brady: b.data?.[0]?.score ?? null,
        tremor: t.data?.[0]?.score ?? null,
        rigidity: r.data?.[0]?.score ?? null,
      });
      setHistory((preds.data ?? []).map((row) => ({
        date: new Date(row.created_at as string).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        score: Number(row.composite_score),
      })));
      setLoading(false);
    })();
  }, []);

  const comp = useMemo(() => compositeScore({
    bradykinesia_score: latest.brady,
    tremor_score: latest.tremor,
    rigidity_score: latest.rigidity,
  }), [latest]);

  async function savePrediction() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("prediction_data").insert({
      user_id: user.id,
      bradykinesia_score: latest.brady,
      tremor_score: latest.tremor,
      rigidity_score: latest.rigidity,
      composite_score: comp.score,
      severity: comp.severity,
      confidence: comp.confidence,
    });
    toast.success("Prediction saved");
    window.location.reload();
  }

  async function onDownload() {
    if (!profile) return;
    await generatePdfReport({ profile, latest, comp, history });
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <section className="rounded-2xl p-6 text-primary-foreground" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/70">Patient {profile?.patient_id ?? "…"}</p>
            <h1 className="mt-1 text-2xl font-semibold">{profile?.name ?? "Welcome"}</h1>
            <p className="text-sm text-white/80">{profile?.age ? `${profile.age} yrs · ${profile.gender}` : "Complete your tests to generate a score."}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-white/70">Composite</p>
            <p className="text-5xl font-bold leading-none">{comp.components ? comp.score : "—"}</p>
            <p className="mt-1 text-sm">{comp.components ? comp.severity : "Take a test"} · {comp.components ? `${comp.confidence}% conf.` : ""}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <ScoreCard title="Bradykinesia" icon={Hand} score={latest.brady} to="/tests/tapping" cta="Tapping test" />
        <ScoreCard title="Tremor" icon={Video} score={latest.tremor} to="/tests/tremor" cta="Camera test" />
        <ScoreCard title="Rigidity" icon={Brain} score={latest.rigidity} to="/tests/rigidity" cta="Movement test" />
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Historical trend</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={savePrediction} disabled={!comp.components}>Save snapshot</Button>
            <Button size="sm" onClick={onDownload} disabled={loading || !profile}>
              <FileDown className="mr-1 h-4 w-4" /> PDF report
            </Button>
          </div>
        </div>
        <div className="mt-4 h-56">
          {history.length === 0 ? (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              No saved snapshots yet. Complete the tests and save a snapshot to track over time.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }} />
                <Line type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <Disclaimer />
    </main>
  );
}

function ScoreCard({ title, icon: Icon, score, to, cta }: { title: string; icon: typeof Hand; score: number | null; to: string; cta: string }) {
  const sev: Severity = score == null ? "Normal" : score < 20 ? "Normal" : score < 45 ? "Mild Parkinson's" : score < 70 ? "Moderate Parkinson's" : "Severe Parkinson's";
  return (
    <div className="rounded-xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4 text-primary" />{title}</div>
        <span className={`text-xs ${score == null ? "text-muted-foreground" : severityColor(sev)}`}>{score == null ? "Not tested" : sev}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold">{score == null ? "—" : score}</p>
      <Link to={to as never} className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">
        {cta} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}