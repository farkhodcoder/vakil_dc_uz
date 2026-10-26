import { describe, expect, it } from "vitest";
import { CROP_TARGET, planCrop } from "./crop";

const portrait = { width: 1000, height: 1500, headTopY: 300, chinY: 800, eyeY: 560, faceCenterX: 500 };

describe("planCrop", () => {
  it("odatiy portret: bosh 59,5 %, ko'z pastdan 62,5 %", () => {
    const r = planCrop(portrait);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.headPct).toBeCloseTo(CROP_TARGET.headPct, 5);
    expect(r.eyePct).toBeCloseTo(CROP_TARGET.eyeFromBottomPct, 5);
    expect(r.crop.size).toBeCloseTo(500 / 0.595, 5);
    expect(r.crop.x).toBeCloseTo(500 - r.crop.size / 2, 5);
    expect(r.lowResolution).toBe(false);
  });

  it("kadr rasm ichida qoladi va bosh tepasi kadrga kiradi", () => {
    const r = planCrop(portrait);
    if (!r.ok) throw new Error(r.reason);
    const { x, y, size } = r.crop;
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(x + size).toBeLessThanOrEqual(1000);
    expect(y + size).toBeLessThanOrEqual(1500);
    expect(y).toBeLessThanOrEqual(portrait.headTopY);
    expect(y + size).toBeGreaterThanOrEqual(portrait.chinY);
  });

  it("yuz chap chetda: x 0 ga siqiladi", () => {
    const r = planCrop({ ...portrait, faceCenterX: 100 });
    expect(r.ok && r.crop.x).toBe(0);
  });

  it("kichik rasm: past sifat ogohlantiriladi", () => {
    const r = planCrop({ width: 500, height: 700, headTopY: 120, chinY: 320, eyeY: 216, faceCenterX: 250 });
    expect(r.ok).toBe(true);
    expect(r.ok && r.lowResolution).toBe(true);
  });

  it("bosh juda katta (kameraga juda yaqin) → too_close", () => {
    expect(planCrop({ width: 600, height: 600, headTopY: 10, chinY: 510, eyeY: 260, faceCenterX: 300 })).toEqual({
      ok: false,
      reason: "too_close",
    });
  });

  it("kvadratga sig'adi, lekin bosh 69 % dan oshmaydi → maksimal kadr", () => {
    // headH 400, kerakli 672 > 600 → 600 olinadi, 400/600 = 66,7 % ≤ 69 %
    const r = planCrop({ width: 600, height: 800, headTopY: 100, chinY: 500, eyeY: 290, faceCenterX: 300 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.crop.size).toBe(600);
    expect(r.headPct).toBeCloseTo(400 / 600, 5);
    expect(r.eyePct).toBeGreaterThanOrEqual(CROP_TARGET.eyeMinPct);
    expect(r.eyePct).toBeLessThanOrEqual(CROP_TARGET.eyeMaxPct);
  });

  it("bosh tepasida joy yo'q → not_enough_space", () => {
    expect(planCrop({ width: 1000, height: 1000, headTopY: 5, chinY: 400, eyeY: 150, faceCenterX: 500 })).toEqual({
      ok: false,
      reason: "not_enough_space",
    });
  });

  it("soch kadrdan chiqqan → head_cut", () => {
    expect(planCrop({ ...portrait, headTopY: 0 })).toEqual({ ok: false, reason: "head_cut" });
    expect(planCrop({ ...portrait, headTouchesTop: true })).toEqual({ ok: false, reason: "head_cut" });
  });

  it("yuz o'lchanmagan → no_face", () => {
    expect(planCrop({ ...portrait, eyeY: null })).toEqual({ ok: false, reason: "no_face" });
    expect(planCrop({ ...portrait, chinY: 200 })).toEqual({ ok: false, reason: "no_face" });
  });
});
