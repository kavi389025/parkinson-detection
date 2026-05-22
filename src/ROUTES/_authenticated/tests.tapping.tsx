import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { bradykinesiaScore } from "@/lib/scoring";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tests/tapping")({
  head: () => ({ meta: [{ title: "Finger tapping — NeuroTrack" }] }),
  component: TappingTest,
});

const DURATION_MS = 30_000;

function TappingTest() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"intro" | "running" | "done">("intro");
  const [timeLeft, setTimeLeft] = useState(30);
  const [tapCount, setTapCount] = useState(0);
  const [expected, setExpected] = useState<"L" | "R">("L"); // alternation
  const tapsRef = useRef<{ t: number; side: "L" | "R"; correct: boolean }[]>([]);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      const elapsed = performance.now() - startRef.current;
      const left = Math.max(0, DURATION_MS - elapsed);
      setTimeLeft(Math.ceil(left / 1000));
      if (left <= 0) {
        clearInterval(id);
        finish();
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function start() {
    tapsRef.current = [];
    setTapCount(0);
    setExpected("L");
    setTimeLeft(30);
    startRef.current = performance.now();
    setPhase("running");
  }

  function tap(side: "L" | "R") {
    if (phase !== "running") return;
    const correct = side === expected;
    tapsRef.current.push({ t: performance.now() - startRef.current, side, correct });
    setExpected((s) => (s === "L" ? "R" : "L"));
    setTapCount((c) => c + 1);
  }

  async function finish() {
    const taps = tapsRef.current;
    const correct = taps.filter((t) => t.correct);
    const total = correct.length;
    const missed = taps.length - total;
    const intervals: number[] = [];
    for (let i = 1; i < correct.length; i++) intervals.push(correct[i].t - correct[i - 1].t);
    const avg = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
    const variance = intervals.length
      ? intervals.reduce((a, b) => a + (b - avg) ** 2, 0) / intervals.length
      : 0;
    const std = Math.sqrt(variance);
    const consistency = avg > 0 ? Math.max(0, 1 - std / avg) : 0;
    const speed = total / (DURATION_MS / 1000); // taps per second
    const reaction = correct[0]?.t ?? DURATION_MS;

    const score = bradykinesiaScore({
      tap_count: total,
      tapping_speed: speed,
      reaction_time: reaction,
      missed_taps: missed,
      tap_consistency: consistency,
      avg_interval: avg,
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("bradykinesia_data").insert({
        user_id: user.id,
        tap_count: total,
        tapping_speed: speed,
        reaction_time: reaction,
        missed_taps: missed,
        tap_consistency: consistency,
        avg_interval: avg,
        score,
      });
    }
    setPhase("done");
    toast.success(`Test complete — score ${score}`);
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-2xl font-semibold">Finger tapping test</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tap the highlighted circle as fast as you can, alternating left and right for 30 seconds.
      </p>

      {phase === "intro" && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <p className="text-sm">Place your phone on a flat surface or hold it comfortably. Use your dominant hand's index finger to tap.</p>
          <Button className="mt-4 w-full" size="lg" onClick={start}>Start 30-second test</Button>
        </div>
      )}

      {phase === "running" && (
        <div className="mt-6 select-none">
          <div className="flex items-center justify-between text-sm">
            <span>Taps: <span className="font-semibold text-foreground">{tapCount}</span></span>
            <span>Time: <span className="font-semibold text-foreground">{timeLeft}s</span></span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <TapTarget label="LEFT" active={expected === "L"} onTap={() => tap("L")} />
            <TapTarget label="RIGHT" active={expected === "R"} onTap={() => tap("R")} />
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">Alternate strictly — the lit side is next.</p>
        </div>
      )}

      {phase === "done" && (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-muted-foreground">Result saved.</p>
          <Button className="w-full" onClick={() => navigate({ to: "/dashboard" })}>Back to dashboard</Button>
          <Button variant="outline" className="w-full" onClick={() => { setPhase("intro"); }}>Try again</Button>
        </div>
      )}
    </main>
  );
}

function TapTarget({ label, active, onTap }: { label: string; active: boolean; onTap: () => void }) {
  return (
    <button
      type="button"
      onPointerDown={onTap}
      className={`relative min-h-[120px] aspect-square rounded-full border-4 transition-all touch-manipulation active:scale-95 ${
        active
          ? "border-primary bg-primary text-primary-foreground scale-100 shadow-[0_10px_40px_-10px_var(--color-primary)]"
          : "border-border bg-muted text-muted-foreground scale-95"
      }`}
    >
      <span className="text-lg font-semibold">{label}</span>
    </button>
  );
}