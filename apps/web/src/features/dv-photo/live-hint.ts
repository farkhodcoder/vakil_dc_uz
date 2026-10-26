import type { LiveHint } from "@/i18n/dictionaries/types";

export interface Point {
  x: number;
  y: number;
}

/**
 * Kamera ekranidagi ko'rsatma. Ko'rinadigan kvadrat — videoning markaziy kvadrati
 * (DV fotosi kvadrat). Taxminiy, faqat yo'naltirish uchun: aniq o'lchov suratga
 * olingandan keyin to'liq tahlil (segmentatsiya bilan) va avto-kesishda bo'ladi.
 */
export const LIVE_GUIDE = {
  /** Ramkadagi bosh balandligi (soch bilan) ≈ ko'z–iyak masofasi × 2,1 */
  headFromEyeChin: 2.1,
  headMin: 0.48,
  headMax: 0.72,
  eyeMin: 0.52, // ko'z chizig'i pastdan
  eyeMax: 0.74,
  maxCenterOffset: 0.1,
  maxTiltDeg: 6,
} as const;

// MediaPipe Face Landmarker indekslari
const CHIN = 152;
const IRIS_LEFT = 468;
const IRIS_RIGHT = 473;
const EYE_LEFT_OUTER = 33;
const EYE_RIGHT_OUTER = 263;

/** faces — normallashgan (0..1) nuqtalar; width/height — video piksellari */
export function liveHint(faces: readonly (readonly Point[])[], width: number, height: number): LiveHint {
  if (faces.length === 0) return "noface";
  if (faces.length > 1) return "multi";
  const lm = faces[0]!;
  const chin = lm[CHIN];
  const left = lm[IRIS_LEFT] ?? lm[EYE_LEFT_OUTER];
  const right = lm[IRIS_RIGHT] ?? lm[EYE_RIGHT_OUTER];
  if (!chin || !left || !right) return "noface";

  const side = Math.min(width, height);
  const ox = (width - side) / 2;
  const oy = (height - side) / 2;
  const px = (p: Point) => ({ x: p.x * width, y: p.y * height });
  const c = px(chin);
  const l = px(left);
  const r = px(right);
  const eyeY = (l.y + r.y) / 2;
  const eyeX = (l.x + r.x) / 2;

  const head = ((c.y - eyeY) * LIVE_GUIDE.headFromEyeChin) / side;
  if (head < LIVE_GUIDE.headMin) return "closer";
  if (head > LIVE_GUIDE.headMax) return "farther";

  const eyeFromBottom = (oy + side - eyeY) / side;
  const offset = Math.abs(eyeX - (ox + side / 2)) / side;
  if (offset > LIVE_GUIDE.maxCenterOffset || eyeFromBottom < LIVE_GUIDE.eyeMin || eyeFromBottom > LIVE_GUIDE.eyeMax) {
    return "center";
  }

  const tilt = (Math.atan2(r.y - l.y, r.x - l.x) * 180) / Math.PI;
  const normalized = Math.abs(((tilt + 90) % 180) - 90); // ko'zgu (oldingi kamera) holatida ham
  if (normalized > LIVE_GUIDE.maxTiltDeg) return "tilt";
  return "ok";
}
