import { describe, expect, it } from "vitest";
import { liveHint, type Point } from "./live-hint";

/** 1280×720 video, markaziy kvadrat 720×720 (x: 280..1000). Yuz nuqtalari pikselda beriladi. */
const W = 1280;
const H = 720;

function face(o: { eyeY: number; chinY: number; eyeX?: number; tiltPx?: number; eyeGap?: number }): Point[] {
  const lm: Point[] = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  const cx = o.eyeX ?? 640;
  const gap = o.eyeGap ?? 60;
  const tilt = o.tiltPx ?? 0;
  lm[152] = { x: cx / W, y: o.chinY / H };
  lm[468] = { x: (cx - gap) / W, y: (o.eyeY - tilt) / H };
  lm[473] = { x: (cx + gap) / W, y: (o.eyeY + tilt) / H };
  return lm;
}

// To'g'ri holat: ko'z pastdan 62 % (y = 720 − 0,62·720 ≈ 274), bosh ≈ 60 % (ko'z–iyak ≈ 0,6·720/2,1 ≈ 206)
const good = { eyeY: 274, chinY: 480 };

describe("liveHint", () => {
  it("to'g'ri turgan odam → ok", () => {
    expect(liveHint([face(good)], W, H)).toBe("ok");
  });
  it("yuz yo'q / ikki yuz", () => {
    expect(liveHint([], W, H)).toBe("noface");
    expect(liveHint([face(good), face(good)], W, H)).toBe("multi");
  });
  it("uzoqda → closer; juda yaqin → farther", () => {
    expect(liveHint([face({ eyeY: 300, chinY: 400 })], W, H)).toBe("closer");
    expect(liveHint([face({ eyeY: 250, chinY: 520 })], W, H)).toBe("farther");
  });
  it("chetda yoki juda pastda → center", () => {
    expect(liveHint([face({ ...good, eyeX: 900 })], W, H)).toBe("center");
    expect(liveHint([face({ eyeY: 420, chinY: 626 })], W, H)).toBe("center");
  });
  it("bosh qiyshiq → tilt", () => {
    expect(liveHint([face({ ...good, tiltPx: 15 })], W, H)).toBe("tilt");
  });
  it("tik video (720×1280) ham ishlaydi", () => {
    const lm: Point[] = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
    // kvadrat y: 280..1000; ko'z pastdan 62 % → y = 1000 − 446 = 554; iyak 554 + 206 = 760
    lm[152] = { x: 0.5, y: 760 / 1280 };
    lm[468] = { x: 300 / 720, y: 554 / 1280 };
    lm[473] = { x: 420 / 720, y: 554 / 1280 };
    expect(liveHint([lm], 720, 1280)).toBe("ok");
  });
});
