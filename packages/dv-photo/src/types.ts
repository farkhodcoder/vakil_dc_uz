export type Locale = "uz_latn" | "uz_cyrl" | "ru" | "en" | "tr";
export type I18n = Record<Locale, string>;

/** Bitta foto mezoni (qoidalar ro'yxati: DV_PHOTO_RULES) */
export interface RuleConfig {
  engine: "rule" | "ai" | "human";
  code: string;
  params?: Record<string, unknown>;
}

export type RuleOutcome = "pass" | "fail" | "warn" | "skip";

export interface RuleCheck {
  code: string;
  outcome: RuleOutcome;
  measured?: Record<string, number | string | boolean>;
  message: I18n;
  fixHint?: I18n;
}

/** Foydalanuvchi o'zi tasdiqlaydigan mezon (avtomatik tekshirib bo'lmaydi) */
export interface SelfCheckItem {
  code: string;
  label: I18n;
}

export interface BackgroundStats {
  /** 0–255, fon piksellarining o'rtacha yorqinligi */
  meanLuma: number;
  /** 0–255, o'rtacha "ranglilik" (max(R,G,B) − min(R,G,B)) */
  meanChroma: number;
  /** yorqinlikning standart og'ishi — soya va naqshlarni ko'rsatadi */
  stdLuma: number;
  /** fon deb topilgan piksellar ulushi, 0–1 */
  sampleRatio: number;
}

/** Brauzerda o'lchangan faktlar. Rasmning o'zi hech qayerga yuborilmaydi. */
export interface PhotoFacts {
  isJpegSignature: boolean;
  sizeBytes: number;
  width: number;
  height: number;
  faceCount: number;
  /** piksel, yuqoridan; null — o'lchab bo'lmadi */
  headTopY: number | null;
  /** boshning tepasi kadr chetiga tegib turibdi (kesilgan bo'lishi mumkin) */
  headTouchesTop: boolean;
  chinY: number | null;
  eyeY: number | null;
  /** yuz markazi (piksel, chapdan) — avto-kesish uchun */
  faceCenterX: number | null;
  background: BackgroundStats | null;
}

export type Verdict = "fail" | "review" | "pass";

export interface PhotoReport {
  verdict: Verdict;
  checks: RuleCheck[];
  selfChecks: SelfCheckItem[];
}
