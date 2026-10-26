import { describe, expect, it } from "vitest";
import { afterLoginPath, callbackUrl, langFromPath, safeNextPath } from "./auth-redirect";

describe("safeNextPath", () => {
  it("nisbiy yo'l qabul qilinadi", () => {
    expect(safeNextPath("/uz/mashq?x=1#a", "/uz")).toBe("/uz/mashq?x=1#a");
  });
  it("tashqi va xavfli manzillar rad etiladi", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "evil", "", null, undefined]) {
      expect(safeNextPath(bad, "/uz")).toBe("/uz");
    }
  });
});

describe("langFromPath", () => {
  it("5 til prefiksi", () => {
    expect(langFromPath("/ru/kabinet")).toBe("ru");
    expect(langFromPath("/oz/mashq")).toBe("oz");
    expect(langFromPath("/en/mashq")).toBe("en");
    expect(langFromPath("/tr")).toBe("tr");
  });
  it("noma'lum yoki bo'sh → uz", () => {
    expect(langFromPath("/de/x")).toBe("uz");
    expect(langFromPath(null)).toBe("uz");
  });
});

describe("afterLoginPath", () => {
  it("so'ralgan sahifaga", () => {
    expect(afterLoginPath("/ru/kabinet")).toBe("/ru/kabinet");
  });
  it("tashqi manzil → mashq sahifasi", () => {
    expect(afterLoginPath("https://evil.com")).toBe("/uz/mashq");
    expect(afterLoginPath(null)).toBe("/uz/mashq");
  });
});

describe("callbackUrl", () => {
  it("next kodlanadi", () => {
    expect(callbackUrl("http://localhost:3000", "/en/mashq#start")).toBe(
      "http://localhost:3000/auth/callback?next=%2Fen%2Fmashq%23start",
    );
  });
});
