import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { StoredPhoto } from "@/features/dv-photo/stored-photo";
import { DICTIONARIES } from "@/i18n/dictionaries";
import { BASE_PATH } from "@/lib/base-path";
import { LANGS } from "@/i18n/locales";
import { buildPracticePdf } from "./pdf";
import { emptyPerson } from "./schema";
import { newPractice, type PracticeData } from "./state";

// 1×1 JPEG (SOF0) — embedJpg uchun yetarli
const JPEG_1PX =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

const photo: StoredPhoto = {
  dataUrl: JPEG_1PX,
  mode: "cropped",
  confirmed: { "photo.no_glasses": true, "photo.quality": true, "photo.taken_within_6_months": true },
  facts: {
    isJpegSignature: true,
    sizeBytes: 90_000,
    width: 600,
    height: 600,
    faceCount: 1,
    headTopY: 60,
    headTouchesTop: false,
    chinY: 420,
    eyeY: 228,
    faceCenterX: 300,
    background: { meanLuma: 235, meanChroma: 6, stdLuma: 8, sampleRatio: 0.4 },
  },
};

function fixture(): PracticeData {
  const d = newPractice("00000000-0000-4000-8000-000000000000");
  d.passport = {
    ...d.passport,
    surname: "KARIMOV",
    givenNames: "ALISHER",
    sex: "male",
    birthDate: { day: "7", month: "3", year: "1994" },
    number: "FA1234567",
    issuingCountry: "Uzbekistan",
    expiry: { day: "1", month: "6", year: "2031" },
  };
  Object.assign(d.form.entrant, {
    lastName: "Karimov",
    firstName: "Alisher",
    noMiddleName: true,
    sex: "male",
    birthDate: { day: "7", month: "3", year: "1994" },
    birthCity: "Tashkent",
    birthCountry: "Uzbekistan",
    eligibilityIsBirthCountry: "yes",
    passportNumber: "FA1234567",
    passportCountry: "Uzbekistan",
    passportExpiry: { day: "1", month: "6", year: "2031" },
  });
  d.form.mailing = { ...d.form.mailing, line1: "Amir Temur ko'chasi 12, 5-xonadon", city: "Tashkent", country: "Uzbekistan" };
  d.form.residenceCountry = "Uzbekistan";
  d.form.email = "alisher.karimov.very.long.address@example.com";
  d.form.education = "university";
  d.form.marital = "married_not_us";
  d.form.spouse = {
    ...emptyPerson(),
    lastName: "Karimova",
    firstName: "Malika",
    noMiddleName: true,
    sex: "female",
    birthDate: { day: "2", month: "11", year: "1996" },
    birthCity: "Samarkand",
    birthCountry: "Uzbekistan",
  };
  d.form.childrenCount = 1;
  d.form.children = [
    {
      ...emptyPerson(),
      lastName: "Karimov",
      firstName: "Aziz",
      noMiddleName: true,
      sex: "male",
      birthDate: { day: "15", month: "8", year: "2020" },
      birthCity: "Tashkent",
      birthCountry: "Uzbekistan",
    },
  ];
  d.photos = { entrant: photo, spouse: photo, "child-0": photo };
  d.completedAt = "2026-10-26T10:00:00.000Z";
  return d;
}

const publicDir = path.resolve(__dirname, "../../../public");

beforeAll(() => {
  // Brauzerdagi fetch("<basePath>/fonts/...") o'rniga — public/ dan o'qiymiz (scripts/setup-assets.mjs ko'chiradi)
  vi.stubGlobal("fetch", async (url: string) => {
    const rel = BASE_PATH && url.startsWith(BASE_PATH) ? url.slice(BASE_PATH.length) : url;
    return new Response(readFileSync(path.join(publicDir, rel)));
  });
});
afterAll(() => vi.unstubAllGlobals());

describe("buildPracticePdf", () => {
  for (const lang of LANGS) {
    it(`${lang}: haqiqiy PDF, shriftlar va fotolar joylangan`, async () => {
      const blob = await buildPracticePdf(fixture(), lang, DICTIONARIES[lang]);
      expect(blob.type).toBe("application/pdf");
      const bytes = new Uint8Array(await blob.arrayBuffer());
      expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
      expect(doc.getTitle()).toContain("Practice Draft");
      // Noto Sans subset (lotin + kirill) joylangan bo'lishi kerak
      expect(bytes.length).toBeGreaterThan(15_000);
      if (process.env.PDF_OUT) writeFileSync(path.join(process.env.PDF_OUT, `sample-${lang}.pdf`), bytes);
    });
  }
});
