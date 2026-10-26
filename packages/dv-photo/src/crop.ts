/**
 * Avto-kesish: o'lchangan yuz geometriyasidan DV talabiga mos kvadrat kadr.
 * Rasmning o'zi o'zgartirilmaydi — faqat kesish va o'lcham (rasmiy talab: yuzni tahrirlamaslik).
 *
 * Maqsad: bosh balandligi 59,5 % (50–69 % oralig'ining o'rtasi),
 * ko'z chizig'i pastdan 62,5 % (56–69 % oralig'ining o'rtasi).
 */
export const CROP_TARGET = {
  headPct: 0.595,
  headMaxPct: 0.69,
  eyeFromBottomPct: 0.625,
  /** chegaradan biroz ichkarida — yaxlitlashda chegaradan chiqib ketmasin */
  eyeMinPct: 0.565,
  eyeMaxPct: 0.685,
  outputSize: 600,
} as const;

export interface CropInput {
  width: number;
  height: number;
  headTopY: number | null;
  chinY: number | null;
  eyeY: number | null;
  faceCenterX: number | null;
  headTouchesTop?: boolean;
}

export interface CropPlan {
  x: number;
  y: number;
  size: number;
}

export type CropFailure =
  /** yuz o'lchanmadi */
  | "no_face"
  /** sochning tepasi kadrdan chiqib ketgan — kesib tuzatib bo'lmaydi */
  | "head_cut"
  /** bosh kadrga nisbatan juda katta — uzoqroq turib qayta suratga olish kerak */
  | "too_close"
  /** bosh tepasida yoki iyak ostida joy yetmaydi */
  | "not_enough_space";

export type CropResult =
  | { ok: true; crop: CropPlan; headPct: number; eyePct: number; lowResolution: boolean }
  | { ok: false; reason: CropFailure };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function planCrop(input: CropInput): CropResult {
  const { width: W, height: H, headTopY, chinY, eyeY, faceCenterX } = input;
  if (headTopY === null || chinY === null || eyeY === null || faceCenterX === null) {
    return { ok: false, reason: "no_face" };
  }
  const headH = chinY - headTopY;
  if (headH <= 0 || W <= 0 || H <= 0) return { ok: false, reason: "no_face" };
  if (input.headTouchesTop || headTopY <= 0) return { ok: false, reason: "head_cut" };

  let size = headH / CROP_TARGET.headPct;
  const maxSize = Math.min(W, H);
  if (size > maxSize) {
    size = maxSize;
    if (headH / size > CROP_TARGET.headMaxPct) return { ok: false, reason: "too_close" };
  }

  // Ko'z chizig'i maqsadli joyda bo'ladigan y; so'ng ruxsat etilgan oraliqqa siqiladi
  const yTarget = eyeY - (1 - CROP_TARGET.eyeFromBottomPct) * size;
  const yMin = Math.max(0, eyeY - (1 - CROP_TARGET.eyeMinPct) * size, chinY - size);
  const yMax = Math.min(H - size, eyeY - (1 - CROP_TARGET.eyeMaxPct) * size, headTopY);
  if (yMin > yMax) return { ok: false, reason: "not_enough_space" };

  const y = clamp(yTarget, yMin, yMax);
  const x = clamp(faceCenterX - size / 2, 0, W - size);

  return {
    ok: true,
    crop: { x, y, size },
    headPct: headH / size,
    eyePct: (y + size - eyeY) / size,
    lowResolution: size < CROP_TARGET.outputSize,
  };
}
