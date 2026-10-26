import { describe, expect, it } from "vitest";
import { backgroundStats, faceGeometry, hasJpegSignature, headTopFromMask } from "./measure";
import type { NormalizedLandmark } from "./measure";

/** 478 nuqtali sintetik yuz: x 0.4–0.6, iyak 0.75, ko'z qorachiqlari 0.38 */
function syntheticLandmarks(): NormalizedLandmark[] {
  const pts: NormalizedLandmark[] = Array.from({ length: 478 }, (_, i) => ({
    x: 0.4 + (i % 21) * 0.01,
    y: 0.4,
  }));
  pts[152] = { x: 0.5, y: 0.75 };
  pts[468] = { x: 0.45, y: 0.38 };
  pts[473] = { x: 0.55, y: 0.38 };
  return pts;
}

describe("hasJpegSignature", () => {
  it("FF D8 FF → true", () => {
    expect(hasJpegSignature(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
  });
  it("PNG imzosi → false", () => {
    expect(hasJpegSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
  });
  it("bo'sh fayl → false", () => {
    expect(hasJpegSignature(new Uint8Array([]))).toBe(false);
  });
});

describe("faceGeometry", () => {
  it("iyak, ko'z chizig'i va yuz markazini piksellarda qaytaradi", () => {
    const g = faceGeometry(syntheticLandmarks(), 600, 600);
    expect(g).not.toBeNull();
    expect(g!.chinY).toBeCloseTo(450);
    expect(g!.eyeY).toBeCloseTo(228);
    expect(g!.centerX).toBeCloseTo(300);
    expect(g!.faceWidth).toBeCloseTo(120);
  });

  it("468 dan kam nuqta → null", () => {
    expect(faceGeometry(syntheticLandmarks().slice(0, 100), 600, 600)).toBeNull();
  });

  it("qorachiq nuqtalari bo'lmasa ko'z burchaklaridan foydalanadi", () => {
    const pts = syntheticLandmarks().slice(0, 468);
    for (const i of [33, 133, 362, 263]) pts[i] = { x: 0.5, y: 0.4 };
    expect(faceGeometry(pts, 600, 600)!.eyeY).toBeCloseTo(240);
  });
});

describe("headTopFromMask", () => {
  const W = 100;
  const H = 100;
  /** y >= top bo'lgan, x 30–70 oralig'idagi to'rtburchak "odam" */
  const rectMask = (top: number) => {
    const m = new Float32Array(W * H);
    for (let y = top; y < H; y++) for (let x = 30; x <= 70; x++) m[y * W + x] = 1;
    return m;
  };

  it("odam boshlangan birinchi qatorni topadi", () => {
    expect(headTopFromMask(rectMask(17), W, H, 50, 40)).toEqual({ y: 17, touchesTop: false });
  });

  it("kadr tepasiga tegsa touchesTop = true", () => {
    expect(headTopFromMask(rectMask(0), W, H, 50, 40)).toEqual({ y: 0, touchesTop: true });
  });

  it("niqob bo'sh → null", () => {
    expect(headTopFromMask(new Float32Array(W * H), W, H, 50, 40)).toBeNull();
  });

  it("markazdan uzoqdagi alohida shovqin hisobga olinmaydi", () => {
    const m = rectMask(40);
    m[5 * W + 2] = 1; // chap chetdagi bitta piksel
    expect(headTopFromMask(m, W, H, 50, 40)?.y).toBe(40);
  });
});

describe("backgroundStats", () => {
  const W = 10;
  const H = 10;
  const fill = (rgb: [number, number, number]) => {
    const a = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      a[i * 4] = rgb[0];
      a[i * 4 + 1] = rgb[1];
      a[i * 4 + 2] = rgb[2];
      a[i * 4 + 3] = 255;
    }
    return a;
  };

  it("oq fon: yorqin, rangsiz, bir xil", () => {
    const s = backgroundStats(fill([250, 250, 250]), new Float32Array(W * H), W, H);
    expect(s.meanLuma).toBeCloseTo(250);
    expect(s.meanChroma).toBe(0);
    expect(s.stdLuma).toBeCloseTo(0);
    expect(s.sampleRatio).toBe(1);
  });

  it("faqat niqobdan tashqaridagi piksellar hisoblanadi", () => {
    const mask = new Float32Array(W * H);
    for (let i = 0; i < 50; i++) mask[i] = 1; // yarmi — odam
    const s = backgroundStats(fill([0, 0, 255]), mask, W, H);
    expect(s.sampleRatio).toBe(0.5);
    expect(s.meanChroma).toBe(255);
  });

  it("fon yo'q → nollar", () => {
    const s = backgroundStats(fill([255, 255, 255]), new Float32Array(W * H).fill(1), W, H);
    expect(s).toEqual({ meanLuma: 0, meanChroma: 0, stdLuma: 0, sampleRatio: 0 });
  });
});
