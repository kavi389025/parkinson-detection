import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { tremorScore } from "@/lib/scoring";
import { getHandLandmarker, startCamera, stopCamera, dominantFrequency, variance } from "@/lib/mediapipe";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tests/tremor")({
  head: () => ({ meta: [{ title: "Tremor test — NeuroTrack" }] }),
  component: TremorTest,
});

const DURATION_MS = 30_000;

function TremorTest() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<"intro" | "loading" | "running" | "done">("intro");
  const [timeLeft, setTimeLeft] = useState(30);
  const [handDetected, setHandDetected] = useState(false);

  useEffect(() => () => { stopCamera(streamRef.current); }, []);

  async function start() {
    setPhase("loading");
    try {
      const landmarker = await getHandLandmarker();
      const video = videoRef.current!;
      streamRef.current = await startCamera(video, "user");
      setPhase("running");

      const xs: number[] = [];
      const ys: number[] = [];
      const ts: number[] = [];
      const startAt = performance.now();

      const tick = () => {
        if (!videoRef.current) return;
        const now = performance.now();
        const elapsed = now - startAt;
        setTimeLeft(Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000)));

        const res = landmarker.detectForVideo(videoRef.current, now);
        if (res.landmarks && res.landmarks.length > 0) {
          setHandDetected(true);
          // Index fingertip = landmark 8
          const tip = res.landmarks[0][8];
          xs.push(tip.x);
          ys.push(tip.y);
          ts.push(now);
          drawHand(canvasRef.current!, videoRef.current!, res.landmarks[0]);
        } else {
          setHandDetected(false);
          drawHand(canvasRef.current!, videoRef.current!, null);
        }

        if (elapsed < DURATION_MS) requestAnimationFrame(tick);
        else finish(xs, ys, ts);
      };
      requestAnimationFrame(tick);
    } catch (e) {
      console.error(e);
      toast.error("Could not start camera. Please allow camera access.");
      setPhase("intro");
    }
  }

  async function finish(xs: number[], ys: number[], ts: number[]) {
    stopCamera(streamRef.current);
    streamRef.current = null;

    if (xs.length < 30) {
      toast.error("Not enough hand detection samples. Please try again with better lighting.");
      setPhase("intro");
      return;
    }

    const durationS = (ts[ts.length - 1] - ts[0]) / 1000;
    const sampleRate = xs.length / durationS;
    const dx = detrend(xs);
    const dy = detrend(ys);
    const freqX = dominantFrequency(dx, sampleRate);
    const freqY = dominantFrequency(dy, sampleRate);
    // Pick stronger axis
    const dominant = freqX.amplitude >= freqY.amplitude ? freqX : freqY;
    const motionVar = (variance(dx) + variance(dy)) / 2;

    const score = tremorScore({
      tremor_frequency: dominant.frequency,
      tremor_amplitude: dominant.amplitude,
      motion_variability: motionVar,
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("tremor_data").insert({
        user_id: user.id,
        tremor_frequency: Number(dominant.frequency.toFixed(2)),
        tremor_amplitude: Number(dominant.amplitude.toFixed(4)),
        motion_variability: Number(motionVar.toFixed(6)),
        samples: xs.length,
        score,
      });
    }
    toast.success(`Test complete — score ${score}`);
    setPhase("done");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-2xl font-semibold">Tremor camera test</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Hold your hand steady in front of the camera (palm or back, fingers spread) for 30 seconds.
      </p>

      {phase === "intro" && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
            <li>Use the front camera in good lighting.</li>
            <li>Rest your elbow on a surface, keep hand floating.</li>
            <li>Don't intentionally move — small tremors will be detected.</li>
          </ul>
          <Button className="mt-4 w-full" size="lg" onClick={start}>Start camera</Button>
        </div>
      )}

      {(phase === "loading" || phase === "running") && (
        <div className="mt-6">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
            <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
              {phase === "loading" ? "Loading model…" : handDetected ? "Hand detected" : "Show hand"}
            </div>
            <div className="absolute right-2 top-2 rounded bg-black/60 px-2 py-1 text-xs text-white">{timeLeft}s</div>
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

function detrend(arr: number[]): number[] {
  if (arr.length === 0) return arr;
  const n = arr.length;
  const xs = arr.map((_, i) => i);
  const meanX = (n - 1) / 2;
  const meanY = arr.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (arr[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;
  return arr.map((y, i) => y - (slope * i + intercept));
}

function drawHand(canvas: HTMLCanvasElement, video: HTMLVideoElement, landmarks: { x: number; y: number }[] | null) {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!landmarks) return;
  ctx.fillStyle = "rgba(120, 180, 255, 0.9)";
  for (const lm of landmarks) {
    ctx.beginPath();
    ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}