import { DV_PHOTO_RULES, evaluatePhoto, type CropFailure, type PhotoFacts, type PhotoReport } from "@vakil/dv-photo";
import type { PhotoState } from "@/features/practice/validate";

/** Brauzerda (sessionStorage) saqlanadigan tayyor foto — serverga yuborilmaydi */
export interface StoredPhoto {
  /** 600×600 JPEG (yoki kesib bo'lmagan asl rasm) — data: URL */
  dataUrl: string;
  facts: PhotoFacts;
  mode: "original" | "cropped" | "unprocessed";
  cropFailure?: CropFailure;
  lowResolution?: boolean;
  /** foydalanuvchi o'zi tasdiqlagan bandlar (ko'zoynak yo'q, 6 oy ichida ...) */
  confirmed: Record<string, boolean>;
}

export const photoReport = (p: StoredPhoto): PhotoReport => evaluatePhoto(p.facts, DV_PHOTO_RULES);

export function photoState(p: StoredPhoto | null | undefined): PhotoState | undefined {
  if (!p) return undefined;
  const report = photoReport(p);
  // Kesib bo'lmagan asl rasm rasmiy formaga yaramaydi
  const verdict = p.mode === "unprocessed" ? "fail" : report.verdict;
  return { verdict, selfChecksDone: report.selfChecks.every((s) => p.confirmed[s.code]) };
}
