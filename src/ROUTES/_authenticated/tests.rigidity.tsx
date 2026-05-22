import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { rigidityScore } from "@/lib/scoring";
import { getPoseLandmarker, startCamera, stopCamera } from "@/lib/mediapipe";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tests/rigidity")({
  head: () => ({ meta: [{ title: "Rigidity test — NeuroTrack" }] }),
  component: RigidityTest,
});

const STEPS = [
  "Raise your arm slowly above your head",
  "Bend your elbow up and down",
  "Rotate your wrist in a circle",
  "Open and close your palm repeatedly",
];
const DURATION_MS = 40_000;

function RigidityTest() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<"intro" | "loading" | "running" | "done">("intro");
  const [step, setStep] = useState(0);
  const [timeLeft, setTimeLeft] = useState(40);

  useEffect(() => () => { stopCamera(streamRef.current); }, []);

  async function start() {
    setPhase("loading");
    try {
      const landmarker = await getPoseLandmarker();
      const video = videoRef.current!;
      streamRef.current = await startCamera(video, "user");
      setPhase("running");

      const wristTrajectory: { x: number; y: number; t: number }[] = [];
      const elbowAngles: number[] = [];
      const startAt = performance.now();

      const tick = () => {
        if (!videoRef.current) return;
        const now = performance.now();
        const elapsed = now - startAt;
        setTimeLeft(Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000)));
        setStep(Math.min(STEPS.length - 1, Math.floor((elapsed / DURATION_MS) * STEPS.length)));

        const res = landmarker.detectForVideo(videoRef.current, now);
        if (res.landmarks && res.landmarks.length > 0) {
          const lm = res.landmarks[0];
          // Right wrist = 16, right elbow = 14, right shoulder = 12
          const wrist = lm[16];
          const elbow = lm[14];
          const shoulder = lm[12];
          if (wrist && elbow && shoulder) {
            wristTrajectory.push({ x: wrist.x, y: wrist.y, t: now });
            const angle = angleBetween(shoulder, elbow, wrist);
            elbowAngles.push(angle);
          }
        }

        if (elapsed < DURATION_MS) requestAnimationFrame(tick);
        else finish(wristTrajectory, elbowAngles);
      };
      requestAnimationFrame(tick);
    } catch (e) {
      console.error(e);
      toast.error("Could not start camera.");
      setPhase("intro");
    }
  }

  async function finish(traj: { x: number; y: number; t: number }[], angles: number[]) {
    stopCamera(streamRef.current);
    streamRef.current = null;

    if (traj.length < 20) {
      toast.error("Not enough motion captured. Please stand fully in frame and retry.");
      setPhase("intro");
      return;
    }

    // Smoothness: low jerk = smooth. Compute mean jerk (3rd derivative magnitude).
    const speeds: number[] = [];
    for (let i = 1; i < traj.length; i++) {
      const dt = (traj[i].t - traj[i - 1].t) / 1000 || 1 / 30;
      const dx = traj[i].x - traj[i - 1].x;
      const dy = traj[i].y - traj[i - 1].y;
      speeds.push(Math.hypot(dx, dy) / dt);
    }
    const accs: number[] = [];
    for (let i = 1; i < speeds.length; i++) accs.push(Math.abs(speeds[i] - speeds[i - 1]));
    const meanSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length || 1;
    const meanAcc = accs.reduce((a, b) => a + b, 0) / (accs.length || 1);
    const smoothness = Math.max(0, Math.min(1, 1 - meanAcc / (meanSpeed * 2)));

    // Range of motion: angle range / 180
    const minA = Math.min(...angles);
    const maxA = Math.max(...angles);
    const rom = Math.max(0, Math.min(1, (maxA - minA) / 180));

    // Overall movement quality = combination
    const movement = (smoothness * 0.6 + rom * 0.4);
    const stiffness = 1 - movement;

    const score = rigidityScore({
      smoothness,
      range_of_motion: rom,
      movement_score: movement,
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("rigidity_data").insert({
        user_id: user.id,
        movement_score: Number(movement.toFixed(3)),
        range_of_motion: Number(rom.toFixed(3)),
        smoothness: Number(smoothness.toFixed(3)),
        stiffness_score: Number(stiffness.toFixed(3)),
        score,
      });
    }
    toast.success(`Test complete — score ${score}`);
    setPhase("done");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-2xl font-semibold">Rigidity / movement test</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Stand back so your upper body fits in frame. Follow the prompts as the timer counts down.
      </p>

      {phase === "intro" && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <ol className="space-y-1 text-sm text-muted-foreground list-decimal pl-5">
            {STEPS.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
          <Button className="mt-4 w-full" size="lg" onClick={start}>Start 40-second test</Button>
        </div>
      )}

      {(phase === "loading" || phase === "running") && (
        <div className="mt-6">
          <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute left-2 top-2 right-2 rounded bg-black/60 px-3 py-2 text-sm text-white">
              {phase === "loading" ? "Loading model…" : STEPS[step]}
            </div>
            <div className="absolute right-2 bottom-2 rounded bg-black/60 px-2 py-1 text-xs text-white">{timeLeft}s</div>
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="mt-6 space-y-3">
          <Button className="w-full" onClick={() => navigate({ to: "/dashboard" })}>Back to dashboard</Button>
          <Button variant="outline" className="w-full" onClick={() => setPhase("intro")}>Run again</Button>
        </div>
      )}
    </main>
  );
}

function angleBetween(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const m1 = Math.hypot(ab.x, ab.y);
  const m2 = Math.hypot(cb.x, cb.y);
  const cos = m1 * m2 === 0 ? 1 : dot / (m1 * m2);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}