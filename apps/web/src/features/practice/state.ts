import type { StoredPhoto } from "@/features/dv-photo/stored-photo";
import { emptyForm, emptyPassport, type DvForm, type PassportRef } from "./schema";
import type { StepId } from "./validate";

/** Pasport skani: fayl o'zi saqlanmaydi — faqat tekshiruv natijasi va kichik eskiz */
export interface ScanInfo {
  isJpeg: boolean;
  width: number;
  height: number;
  sizeBytes: number;
  thumbDataUrl: string;
}

export interface PracticeData {
  v: 1;
  sessionId: string;
  step: StepId;
  passport: PassportRef;
  scan: ScanInfo | null;
  form: DvForm;
  /** "entrant", "spouse", "child-0", ... */
  photos: Record<string, StoredPhoto | null>;
  /** "Tekshirish" bir marta bosilgach, xatolar maydonlar yonida ko'rsatiladi */
  checked: boolean;
  completedAt: string | null;
}

const PREFIX = "vakil.practice.";

export function newPractice(sessionId: string): PracticeData {
  return {
    v: 1,
    sessionId,
    step: "passport",
    passport: emptyPassport(),
    scan: null,
    form: emptyForm(),
    photos: {},
    checked: false,
    completedAt: null,
  };
}

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function parse(raw: string | null): PracticeData | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as PracticeData;
    return data?.v === 1 && typeof data.sessionId === "string" ? data : null;
  } catch {
    return null;
  }
}

export function loadPractice(sessionId: string): PracticeData | null {
  return parse(storage()?.getItem(PREFIX + sessionId) ?? null);
}

/** false — brauzer xotirasi to'lgan (fotolar katta) yoki saqlash taqiqlangan */
export function savePractice(data: PracticeData): boolean {
  try {
    storage()?.setItem(PREFIX + data.sessionId, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearPractice(sessionId: string) {
  try {
    storage()?.removeItem(PREFIX + sessionId);
  } catch {
    // e'tiborsiz
  }
}

/** Shu oynada yakunlangan eng oxirgi mashq (PDF'ni qayta yuklab olish uchun) */
export function lastCompletedPractice(): PracticeData | null {
  const s = storage();
  if (!s) return null;
  let best: PracticeData | null = null;
  for (let i = 0; i < s.length; i++) {
    const key = s.key(i);
    if (!key?.startsWith(PREFIX)) continue;
    const data = parse(s.getItem(key));
    if (data?.completedAt && (!best || data.completedAt > (best.completedAt ?? ""))) best = data;
  }
  return best;
}

/** Bugungi sana (qurilma vaqti bo'yicha), ISO */
export function todayIso(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}
