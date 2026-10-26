/**
 * Click integratsiyasi (manba: https://docs.click.uz — "Платежная ссылка" va "SHOP API", 2026-10-26 o'qildi).
 *
 *  1. Foydalanuvchi my.click.uz/services/pay ga yo'naltiriladi (transaction_param = bizning payments.id).
 *  2. Click serveri Prepare (action=0) va Complete (action=1) so'rovlarini yuboradi:
 *     POST, application/x-www-form-urlencoded → /api/click/prepare, /api/click/complete.
 *  3. Imzo tekshiruvi va holat o'zgarishi bazada: public.click_prepare / public.click_complete
 *     (SECRET_KEY Supabase Vault'da — veb-serverga kerak emas).
 */

export const CLICK_PAY_URL = "https://my.click.uz/services/pay/";

export const CLICK_FIELDS = [
  "click_trans_id",
  "service_id",
  "click_paydoc_id",
  "merchant_trans_id",
  "merchant_prepare_id",
  "amount",
  "action",
  "error",
  "error_note",
  "sign_time",
  "sign_string",
] as const;
export type ClickField = (typeof CLICK_FIELDS)[number];
export type ClickForm = Partial<Record<ClickField, string>>;

export interface ClickResponse {
  error: number;
  error_note: string;
  click_trans_id?: number;
  merchant_trans_id?: string;
  merchant_prepare_id?: number;
  merchant_confirm_id?: number;
}

/** Bazaga yetib bormagan holatda (tarmoq, Supabase) — Click qayta urinadi */
export const CLICK_INTERNAL_ERROR: ClickResponse = { error: -8, error_note: "Error in request from click" };

const MAX_FIELD_LENGTH = 256;

/** Faqat protokol maydonlari, faqat matn, uzunligi cheklangan */
export function pickClickFields(entries: Iterable<[string, unknown]>): ClickForm {
  const out: ClickForm = {};
  for (const [key, value] of entries) {
    if (typeof value !== "string" || value.length > MAX_FIELD_LENGTH) continue;
    if ((CLICK_FIELDS as readonly string[]).includes(key)) out[key as ClickField] = value;
  }
  return out;
}

export function isClickResponse(v: unknown): v is ClickResponse {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as ClickResponse).error === "number" &&
    typeof (v as ClickResponse).error_note === "string"
  );
}

/** 999900 tiyin → "9999.00" (hujjatdagi format: N.NN) */
export function formatClickAmount(tiyin: number): string {
  if (!Number.isSafeInteger(tiyin) || tiyin <= 0) throw new Error("summa noto'g'ri");
  return `${Math.floor(tiyin / 100)}.${String(tiyin % 100).padStart(2, "0")}`;
}

export interface ClickPayParams {
  serviceId: string;
  merchantId: string;
  amountTiyin: number;
  transactionParam: string;
  returnUrl?: string;
}

export function buildClickPayUrl(p: ClickPayParams): string {
  const url = new URL(CLICK_PAY_URL);
  url.searchParams.set("service_id", p.serviceId);
  url.searchParams.set("merchant_id", p.merchantId);
  url.searchParams.set("amount", formatClickAmount(p.amountTiyin));
  url.searchParams.set("transaction_param", p.transactionParam);
  if (p.returnUrl) url.searchParams.set("return_url", p.returnUrl);
  return url.toString();
}

export interface ClickConfig {
  serviceId: string;
  merchantId: string;
}

/** Click kalitlari kiritilmagan bo'lsa — null (to'lov tugmasi "hali ulanmagan" deydi) */
export function getClickConfig(env: Record<string, string | undefined> = process.env): ClickConfig | null {
  const serviceId = env.CLICK_SERVICE_ID?.trim();
  const merchantId = env.CLICK_MERCHANT_ID?.trim();
  if (!serviceId || !merchantId || !/^\d+$/.test(serviceId) || !/^\d+$/.test(merchantId)) return null;
  return { serviceId, merchantId };
}
