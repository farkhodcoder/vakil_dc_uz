import "server-only";
import { createHash } from "node:crypto";

/**
 * Click imzosi (docs.click.uz/shop-api/requests). Asosiy tekshiruv bazada (SQL md5) —
 * bu funksiyalar faqat lokal sinov to'lovi va testlar uchun.
 *   Prepare:  md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time)
 *   Complete: md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + merchant_prepare_id + amount + action + sign_time)
 */
export interface SignInput {
  clickTransId: string;
  serviceId: string;
  merchantTransId: string;
  merchantPrepareId?: string;
  amount: string;
  action: "0" | "1";
  signTime: string;
}

export function clickSign(input: SignInput, secret: string): string {
  const parts = [
    input.clickTransId,
    input.serviceId,
    secret,
    input.merchantTransId,
    input.action === "1" ? (input.merchantPrepareId ?? "") : "",
    input.amount,
    input.action,
    input.signTime,
  ];
  return createHash("md5").update(parts.join(""), "utf8").digest("hex");
}

/** "2026-10-26 12:00:00" — hujjatdagi format (YYYY-MM-DD HH:mm:ss) */
export function clickSignTime(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}
