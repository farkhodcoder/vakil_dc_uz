import { describe, expect, it } from "vitest";
import { BACKGROUND_HEURISTIC, DV_PHOTO_RULES, evaluatePhoto } from "./rules";
import type { PhotoFacts, RuleConfig } from "./types";

const DV_RULES: readonly RuleConfig[] = DV_PHOTO_RULES;

/** To'g'ri foto: bosh 60%, ko'z chizig'i pastdan 62%, oq fon */
const GOOD: PhotoFacts = {
  isJpegSignature: true,
  sizeBytes: 180_000,
  width: 600,
  height: 600,
  faceCount: 1,
  headTopY: 90, // 600 * 0.15
  chinY: 450, // (450 - 90) / 600 = 60%
  eyeY: 228, // (600 - 228) / 600 = 62%
  headTouchesTop: false,
  faceCenterX: 300,
  background: { meanLuma: 235, meanChroma: 6, stdLuma: 8, sampleRatio: 0.45 },
};

const outcome = (facts: PhotoFacts, code: string, rules = DV_RULES) =>
  evaluatePhoto(facts, rules).checks.find((c) => c.code === code)?.outcome;

describe("evaluatePhoto — to'g'ri foto", () => {
  it("barcha avtomatik mezonlar o'tadi, faqat o'z-o'zini tasdiqlash qoladi", () => {
    const r = evaluatePhoto(GOOD, DV_RULES);
    expect(r.checks.every((c) => c.outcome === "pass")).toBe(true);
    expect(r.selfChecks.map((s) => s.code)).toEqual([
      "photo.no_glasses",
      "photo.quality",
      "photo.taken_within_6_months",
    ]);
    expect(r.verdict).toBe("review");
  });

  it("o'z-o'zini tasdiqlash yo'q bo'lsa verdict = pass", () => {
    const onlyRules = DV_RULES.filter((r) => r.engine === "rule");
    expect(evaluatePhoto(GOOD, onlyRules).verdict).toBe("pass");
  });

  it("o'nlik kasr: o'zbek/rus/turkchada vergul (59,9), inglizchada nuqta (59.9)", () => {
    const c = evaluatePhoto({ ...GOOD, headTopY: 90, chinY: 449.4 }, DV_RULES).checks.find(
      (x) => x.code === "photo.head_height_pct",
    );
    expect(c?.message.uz_latn).toContain("59,9%");
    expect(c?.message.uz_cyrl).toContain("59,9%");
    expect(c?.message.ru).toContain("59,9%");
    expect(c?.message.tr).toContain("%59,9");
    expect(c?.message.en).toContain("59.9%");
  });

  it("har bir xabar va maslahat 5 tilda", () => {
    const bad = { ...GOOD, isJpegSignature: false, width: 800, sizeBytes: 300_000, chinY: 560 };
    for (const facts of [GOOD, bad]) {
      const r = evaluatePhoto(facts, DV_RULES);
      for (const c of r.checks) {
        for (const text of [c.message, c.fixHint].filter((x) => x !== undefined)) {
          for (const locale of ["uz_latn", "uz_cyrl", "ru", "en", "tr"] as const) {
            expect(text[locale].length, `${c.code} ${locale}`).toBeGreaterThan(0);
            expect(text[locale], `${c.code} ${locale}`).not.toMatch(/\{\w+\}/);
          }
        }
      }
      for (const s of r.selfChecks) expect(s.label.en.length).toBeGreaterThan(0);
    }
  });
});

describe("evaluatePhoto — noto'g'ri foto", () => {
  it("PNG (JPEG imzosi yo'q) → format fail", () => {
    expect(outcome({ ...GOOD, isJpegSignature: false }, "photo.format_jpeg")).toBe("fail");
  });

  it("800×600 → o'lcham fail, tuzatish maslahati bor", () => {
    const c = evaluatePhoto({ ...GOOD, width: 800 }, DV_RULES).checks.find((x) => x.code === "photo.dimensions");
    expect(c?.outcome).toBe("fail");
    expect(c?.fixHint?.uz_latn).toContain("600×600");
  });

  it("300 KB → hajm fail", () => {
    expect(outcome({ ...GOOD, sizeBytes: 300_000 }, "photo.max_size")).toBe("fail");
  });

  it("bosh 75% → fail (juda katta)", () => {
    const c = evaluatePhoto({ ...GOOD, headTopY: 0, chinY: 450 }, DV_RULES).checks.find(
      (x) => x.code === "photo.head_height_pct",
    );
    expect(c?.outcome).toBe("fail");
    expect(c?.message.uz_latn).toContain("juda katta");
  });

  it("bosh 40% → fail (juda kichik)", () => {
    const c = evaluatePhoto({ ...GOOD, headTopY: 150, chinY: 390 }, DV_RULES).checks.find(
      (x) => x.code === "photo.head_height_pct",
    );
    expect(c?.outcome).toBe("fail");
    expect(c?.message.uz_latn).toContain("juda kichik");
  });

  it("ko'z chizig'i pastdan 50% → fail (juda past)", () => {
    expect(outcome({ ...GOOD, eyeY: 300 }, "photo.eye_line_pct_from_bottom")).toBe("fail");
  });

  it("ko'z chizig'i pastdan 75% → fail (juda yuqori)", () => {
    expect(outcome({ ...GOOD, eyeY: 150 }, "photo.eye_line_pct_from_bottom")).toBe("fail");
  });

  it("qorong'i rangli fon → fail", () => {
    const bg = { meanLuma: 90, meanChroma: 60, stdLuma: 20, sampleRatio: 0.4 };
    expect(outcome({ ...GOOD, background: bg }, "photo.background_white")).toBe("fail");
  });

  it("yuz yo'q → face fail, geometriya skip, verdict fail", () => {
    const r = evaluatePhoto({ ...GOOD, faceCount: 0, headTopY: null, chinY: null, eyeY: null }, DV_RULES);
    expect(r.checks.find((c) => c.code === "photo.face_detected")?.outcome).toBe("fail");
    expect(r.checks.find((c) => c.code === "photo.head_height_pct")?.outcome).toBe("skip");
    expect(r.checks.find((c) => c.code === "photo.eye_line_pct_from_bottom")?.outcome).toBe("skip");
    expect(r.verdict).toBe("fail");
  });

  it("ikki yuz → fail, geometriya o'lchanmaydi", () => {
    const r = evaluatePhoto({ ...GOOD, faceCount: 2 }, DV_RULES);
    expect(r.checks.find((c) => c.code === "photo.face_detected")?.outcome).toBe("fail");
    expect(r.checks.find((c) => c.code === "photo.head_height_pct")?.outcome).toBe("skip");
  });
});

describe("evaluatePhoto — chegaraviy holatlar", () => {
  it("aynan 240 000 bayt → pass, 240 001 → fail", () => {
    expect(outcome({ ...GOOD, sizeBytes: 240_000 }, "photo.max_size")).toBe("pass");
    expect(outcome({ ...GOOD, sizeBytes: 240_001 }, "photo.max_size")).toBe("fail");
  });

  it("bosh aynan 50% va 69% → pass (chegaralar kiradi)", () => {
    expect(outcome({ ...GOOD, headTopY: 100, chinY: 400 }, "photo.head_height_pct")).toBe("pass"); // 50%
    expect(outcome({ ...GOOD, headTopY: 36, chinY: 450 }, "photo.head_height_pct")).toBe("pass"); // 69%
  });

  it("bosh 49.9% va 69.2% → fail", () => {
    expect(outcome({ ...GOOD, headTopY: 100, chinY: 399.4 }, "photo.head_height_pct")).toBe("fail");
    expect(outcome({ ...GOOD, headTopY: 34.8, chinY: 450 }, "photo.head_height_pct")).toBe("fail");
  });

  it("ko'z chizig'i aynan 56% va 69% → pass", () => {
    expect(outcome({ ...GOOD, eyeY: 264 }, "photo.eye_line_pct_from_bottom")).toBe("pass"); // 56%
    expect(outcome({ ...GOOD, eyeY: 186 }, "photo.eye_line_pct_from_bottom")).toBe("pass"); // 69%
  });

  it("599×600 → fail", () => {
    expect(outcome({ ...GOOD, width: 599 }, "photo.dimensions")).toBe("fail");
  });

  it("bosh kadr chetiga tegsa, foiz to'g'ri bo'lsa ham → warn", () => {
    expect(outcome({ ...GOOD, headTopY: 0, chinY: 380, headTouchesTop: true }, "photo.head_height_pct")).toBe("warn");
  });

  it("fon chegarasi: luma aynan passMinLuma → pass; oqish fon → warn", () => {
    const h = BACKGROUND_HEURISTIC;
    const edge = { meanLuma: h.passMinLuma, meanChroma: 10, stdLuma: 10, sampleRatio: 0.3 };
    expect(outcome({ ...GOOD, background: edge }, "photo.background_white")).toBe("pass");
    const offWhite = { meanLuma: 185, meanChroma: 30, stdLuma: 15, sampleRatio: 0.3 };
    expect(outcome({ ...GOOD, background: offWhite }, "photo.background_white")).toBe("warn");
  });

  it("fon juda kam ko'rinsa → skip (taxmin qilinmaydi)", () => {
    const tiny = { meanLuma: 240, meanChroma: 5, stdLuma: 5, sampleRatio: 0.04 };
    const r = evaluatePhoto({ ...GOOD, background: tiny }, DV_RULES);
    expect(r.checks.find((c) => c.code === "photo.background_white")?.outcome).toBe("skip");
    expect(r.verdict).toBe("review");
  });

  it("parametrsiz qoida → skip (yashirin standart qiymat yo'q)", () => {
    const rules: RuleConfig[] = [{ engine: "rule", code: "photo.dimensions" }];
    expect(outcome(GOOD, "photo.dimensions", rules)).toBe("skip");
  });

  it("noma'lum qoida kodi → skip, xato bermaydi", () => {
    const rules: RuleConfig[] = [{ engine: "rule", code: "photo.unknown_rule" }];
    expect(outcome(GOOD, "photo.unknown_rule", rules)).toBe("skip");
  });

  it("geometriya qoidasi bo'lmasa yuz tekshiruvi qo'shilmaydi", () => {
    const rules: RuleConfig[] = [{ engine: "rule", code: "photo.format_jpeg" }];
    expect(evaluatePhoto(GOOD, rules).checks.map((c) => c.code)).toEqual(["photo.format_jpeg"]);
  });
});
