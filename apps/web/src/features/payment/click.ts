/**
 * Click integratsiyasi (manba: https://docs.click.uz — "Платежная ссылка" va "SHOP API", 2026-10-26 o'qildi).
 *
 *  1. Foydalanuvchi my.click.uz/services/pay ga yo'naltiriladi (transaction_param = bizning payments.id).
 *  2. Click serveri Prepare (action=0) va Complete (action=1) so'rovlarini yuboradi:
 *     POST, application/x-www-form-urlencoded → Supabase Edge Function supabase/functions/click
 *     (…/functions/v1/click/prepare, …/click/complete).
 *  3. Imzo tekshiruvi va holat o'zgarishi bazada: public.click_prepare / public.click_complete
 *     (SECRET_KEY Supabase Vault'da — saytga kerak emas).
 */

export const CLICK_PAY_URL = "https://my.click.uz/services/pay/";

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

/** Click ID'lari (maxfiy emas) build paytida beriladi; bo'sh bo'lsa — to'lov tugmasi "hali ulanmagan" deydi */
export function getClickConfig(
  env: { serviceId?: string; merchantId?: string } = {
    // Next faqat to'g'ridan-to'g'ri yozilgan process.env.NEXT_PUBLIC_* ni brauzer kodiga qo'yadi
    serviceId: process.env.NEXT_PUBLIC_CLICK_SERVICE_ID,
    merchantId: process.env.NEXT_PUBLIC_CLICK_MERCHANT_ID,
  },
): ClickConfig | null {
  const serviceId = env.serviceId?.trim();
  const merchantId = env.merchantId?.trim();
  if (!serviceId || !merchantId || !/^\d+$/.test(serviceId) || !/^\d+$/.test(merchantId)) return null;
  return { serviceId, merchantId };
}
