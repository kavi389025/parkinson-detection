// Scoring engine for Parkinson's screening.
// Each module returns a 0-100 score (higher = more abnormal).
// Composite + severity is rule-based until a trained model is integrated.

export type Severity = "Normal" | "Mild Parkinson's" | "Moderate Parkinson's" | "Severe Parkinson's";

export interface TappingMetrics {
  tap_count: number;
  tapping_speed: number; // taps per second
  reaction_time: number; // ms to first tap
  missed_taps: number;
  tap_consistency: number; // 0-1, 1 = perfectly consistent
  avg_interval: number; // ms between taps
}

// Bradykinesia score: slower + more variable = worse.
export function bradykinesiaScore(m: TappingMetrics): number {
  // Healthy adults: ~5-7 taps/sec. <3 considered slow.
  const speedScore = clamp01((5 - m.tapping_speed) / 4) * 60;
  const consistencyScore = (1 - m.tap_consistency) * 30;
  const missScore = Math.min(m.missed_taps * 2, 10);
  return Math.round(clamp01((speedScore + consistencyScore + missScore) / 100) * 100);
}

export interface TremorMetrics {
  tremor_frequency: number; // Hz
  tremor_amplitude: number; // normalized 0..1
  motion_variability: number; // 0..1
}

// Tremor score: PD rest tremor is 4-6 Hz with measurable amplitude.
export function tremorScore(m: TremorMetrics): number {
  const inBand = m.tremor_frequency >= 3.5 && m.tremor_frequency <= 7
    ? 1
    : Math.max(0, 1 - Math.abs(m.tremor_frequency - 5) / 5);
  const amp = clamp01(m.tremor_amplitude / 0.05); // 5% of frame is large
  const raw = inBand * amp * 100;
  return Math.round(clamp01(raw / 100) * 100);
}

export interface RigidityMetrics {
  smoothness: number; // 0..1, lower = jerkier
  range_of_motion: number; // 0..1, lower = restricted
  movement_score: number; // 0..1 overall fluidity
}

export function rigidityScore(m: RigidityMetrics): number {
  const stiff = (1 - m.smoothness) * 50;
  const restricted = (1 - m.range_of_motion) * 30;
  const overall = (1 - m.movement_score) * 20;
  return Math.round(clamp01((stiff + restricted + overall) / 100) * 100);
}

export interface CompositeInput {
  bradykinesia_score?: number | null;
  tremor_score?: number | null;
  rigidity_score?: number | null;
}

export function compositeScore(c: CompositeInput): { score: number; severity: Severity; confidence: number; components: number } {
  const vals = [c.bradykinesia_score, c.tremor_score, c.rigidity_score].filter(
    (v): v is number => typeof v === "number"
  );
  if (vals.length === 0) return { score: 0, severity: "Normal", confidence: 0, components: 0 };
  const score = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  const severity: Severity =
    score < 20 ? "Normal" : score < 45 ? "Mild Parkinson's" : score < 70 ? "Moderate Parkinson's" : "Severe Parkinson's";
  // Confidence scales with number of modules completed.
  const confidence = Math.round((vals.length / 3) * (50 + score * 0.4));
  return { score, severity, confidence: Math.min(99, Math.max(40, confidence)), components: vals.length };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function severityColor(s: Severity): string {
  switch (s) {
    case "Normal": return "text-success";
    case "Mild Parkinson's": return "text-warning";
    case "Moderate Parkinson's": return "text-warning";
    case "Severe Parkinson's": return "text-destructive";
  }
}