import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Hand, Video, Brain, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { Disclaimer } from "@/components/Disclaimer";
import { InstallAppBanner } from "@/components/InstallAppBanner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NeuroTrack — Parkinson's Screening & Monitoring" },
      { name: "description", content: "Software-only Parkinson's disease screening using bradykinesia, tremor, and rigidity tests powered by your phone camera." },
      { property: "og:title", content: "NeuroTrack — Parkinson's Screening" },
      { property: "og:description", content: "Camera-based, hardware-free Parkinson's monitoring." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background safe-area-bottom">
      <AppHeader />
      <InstallAppBanner />
      <section
        className="relative overflow-hidden"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24 text-primary-foreground">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5" />
            Research & screening tool
          </div>
          <h1 className="mt-5 text-3xl font-bold leading-tight sm:text-5xl">
            Parkinson's detection
          </h1>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signup">
              <Button size="lg" className="bg-white text-primary-deep hover:bg-white/90">
                Get started <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10">
                I have an account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        <h2 className="text-2xl font-semibold text-foreground">Three motor markers, one score</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Hand, title: "Bradykinesia", desc: "30-second alternating finger tap test measuring speed, rhythm, and consistency." },
            { icon: Video, title: "Tremor", desc: "Front-camera hand tracking via MediaPipe to estimate tremor frequency and amplitude." },
            { icon: Brain, title: "Rigidity", desc: "Guided arm and wrist movements analyzed for smoothness and range of motion." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <Disclaimer />
        </div>
      </section>
    </div>
  );
}
