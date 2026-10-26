import { describe, expect, it } from "vitest";
import { LANGS } from "../locales";
import { DICTIONARIES, format } from "./index";

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

/** Barcha barg yo'llari: "home.why.0.title" → qiymat */
function leaves(value: Json, prefix = ""): Map<string, Json> {
  const out = new Map<string, Json>();
  if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      for (const [p, leaf] of leaves(v as Json, prefix ? `${prefix}.${k}` : k)) out.set(p, leaf);
    }
  } else out.set(prefix, value);
  return out;
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("lug'atlar", () => {
  const base = leaves(DICTIONARIES.uz as unknown as Json);

  for (const lang of LANGS) {
    it(`${lang}: tuzilma uz bilan bir xil, bo'sh matn yo'q, o'zgaruvchilar mos`, () => {
      const own = leaves(DICTIONARIES[lang] as unknown as Json);
      expect([...own.keys()].sort()).toEqual([...base.keys()].sort());
      for (const [path, value] of own) {
        expect(typeof value, path).toBe("string");
        expect((value as string).trim().length, path).toBeGreaterThan(0);
        expect(placeholders(value as string), path).toEqual(placeholders(base.get(path) as string));
      }
    });
  }

  it("oylar — 12 ta", () => {
    for (const lang of LANGS) expect(DICTIONARIES[lang].months).toHaveLength(12);
  });

  it("format", () => {
    expect(format("{n}-farzand", { n: 2 })).toBe("2-farzand");
    expect(format("{a} {b}", { a: 1 })).toBe("1 {b}");
  });
});
