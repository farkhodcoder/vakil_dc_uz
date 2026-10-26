import type { BackgroundStats } from "./types";

export interface NormalizedLandmark {
  x: number;
  y: number;
  z?: number;
}

export interface FaceGeometry {
  /** piksel */
  chinY: number;
  eyeY: number;
  centerX: number;
  faceWidth: number;
}

// MediaPipe Face Landmarker indekslari (478 nuqtali model)
const CHIN = 152;
const IRIS_LEFT = 468;
const IRIS_RIGHT = 473;
const EYE_CORNERS = [33, 133, 362, 263] as const;
const MIN_FACE_MESH_POINTS = 468;

/** JPEG fayli FF D8 FF bilan boshlanadi (kengaytmaga emas, mazmunga qaraymiz) */
export function hasJpegSignature(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export function faceGeometry(
  landmarks: readonly NormalizedLandmark[],
  width: number,
  height: number,
): FaceGeometry | null {
  if (landmarks.length < MIN_FACE_MESH_POINTS) return null;

  const chin = landmarks[CHIN];
  if (!chin) return null;

  const eyePoints =
    landmarks.length > IRIS_RIGHT
      ? [landmarks[IRIS_LEFT], landmarks[IRIS_RIGHT]]
      : EYE_CORNERS.map((i) => landmarks[i]);
  const eyes = eyePoints.filter((p): p is NormalizedLandmark => p !== undefined);
  if (eyes.length === 0) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  for (const p of landmarks) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
  }

  return {
    chinY: chin.y * height,
    eyeY: (eyes.reduce((s, p) => s + p.y, 0) / eyes.length) * height,
    centerX: ((minX + maxX) / 2) * width,
    faceWidth: (maxX - minX) * width,
  };
}

/**
 * Boshning eng yuqori nuqtasi (soch bilan) — segmentatsiya niqobi bo'yicha.
 * Yuz markazidagi tor ustunda "odam" piksellari ulushi minFraction'dan oshgan birinchi qator.
 */
export function headTopFromMask(
  mask: ArrayLike<number>,
  width: number,
  height: number,
  centerX: number,
  faceWidth: number,
  opts: { threshold?: number; minFraction?: number } = {},
): { y: number; touchesTop: boolean } | null {
  const threshold = opts.threshold ?? 0.5;
  const minFraction = opts.minFraction ?? 0.3;

  const half = Math.max(1, Math.round(faceWidth * 0.25));
  const x0 = Math.max(0, Math.round(centerX) - half);
  const x1 = Math.min(width - 1, Math.round(centerX) + half);
  const bandWidth = x1 - x0 + 1;
  if (bandWidth <= 0) return null;

  for (let y = 0; y < height; y++) {
    let person = 0;
    const row = y * width;
    for (let x = x0; x <= x1; x++) {
      if ((mask[row + x] ?? 0) >= threshold) person++;
    }
    if (person / bandWidth >= minFraction) {
      return { y, touchesTop: y === 0 };
    }
  }
  return null;
}

/** Fon statistikasi: niqob bo'yicha "odam emas" deb topilgan piksellar */
export function backgroundStats(
  rgba: ArrayLike<number>,
  mask: ArrayLike<number>,
  width: number,
  height: number,
  threshold = 0.2,
): BackgroundStats {
  let n = 0;
  let sumLuma = 0;
  let sumLuma2 = 0;
  let sumChroma = 0;
  const total = width * height;

  for (let i = 0; i < total; i++) {
    if ((mask[i] ?? 1) >= threshold) continue;
    const r = rgba[i * 4] ?? 0;
    const g = rgba[i * 4 + 1] ?? 0;
    const b = rgba[i * 4 + 2] ?? 0;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    n++;
    sumLuma += luma;
    sumLuma2 += luma * luma;
    sumChroma += Math.max(r, g, b) - Math.min(r, g, b);
  }

  if (n === 0) return { meanLuma: 0, meanChroma: 0, stdLuma: 0, sampleRatio: 0 };
  const meanLuma = sumLuma / n;
  return {
    meanLuma,
    meanChroma: sumChroma / n,
    stdLuma: Math.sqrt(Math.max(0, sumLuma2 / n - meanLuma * meanLuma)),
    sampleRatio: n / total,
  };
}
