// Lazy-loaded MediaPipe HandLandmarker & PoseLandmarker (WASM tasks-vision).
import {
  HandLandmarker,
  PoseLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const HAND_MODEL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const POSE_MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let handLandmarker: HandLandmarker | null = null;
let poseLandmarker: PoseLandmarker | null = null;

async function createLandmarker<T>(
  create: (vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>, delegate: "GPU" | "CPU") => Promise<T>,
): Promise<T> {
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
  try {
    return await create(vision, "GPU");
  } catch {
    return await create(vision, "CPU");
  }
}

export async function getHandLandmarker(): Promise<HandLandmarker> {
  if (handLandmarker) return handLandmarker;
  handLandmarker = await createLandmarker((vision, delegate) =>
    HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: HAND_MODEL, delegate },
      runningMode: "VIDEO",
      numHands: 1,
    }),
  );
  return handLandmarker;
}

export async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (poseLandmarker) return poseLandmarker;
  poseLandmarker = await createLandmarker((vision, delegate) =>
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: POSE_MODEL, delegate },
      runningMode: "VIDEO",
      numPoses: 1,
    }),
  );
  return poseLandmarker;
}

export async function startCamera(video: HTMLVideoElement, facingMode: "user" | "environment" = "user") {
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  video.muted = true;

  const constraints: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
    },
  };

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode },
    });
  }

  video.srcObject = stream;
  await video.play();
  return stream;
}

export function stopCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

// FFT-style dominant frequency via autocorrelation (cheap, no extra deps).
export function dominantFrequency(signal: number[], sampleRateHz: number): { frequency: number; amplitude: number } {
  if (signal.length < 16) return { frequency: 0, amplitude: 0 };
  const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
  const centered = signal.map((s) => s - mean);
  const amplitude = Math.sqrt(centered.reduce((a, b) => a + b * b, 0) / centered.length);

  // search lags corresponding to 2..12 Hz
  const minLag = Math.max(2, Math.floor(sampleRateHz / 12));
  const maxLag = Math.min(centered.length - 1, Math.floor(sampleRateHz / 2));
  let bestLag = minLag;
  let bestCorr = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i + lag < centered.length; i++) {
      sum += centered[i] * centered[i + lag];
    }
    if (sum > bestCorr) { bestCorr = sum; bestLag = lag; }
  }
  const frequency = sampleRateHz / bestLag;
  return { frequency, amplitude };
}

export function variance(signal: number[]): number {
  if (signal.length === 0) return 0;
  const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
  return signal.reduce((a, b) => a + (b - mean) ** 2, 0) / signal.length;
}