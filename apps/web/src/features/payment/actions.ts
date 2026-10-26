"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isLang, type Lang } from "@/i18n/locales";
import { createClient } from "@/lib/supabase/server";
import { buildClickPayUrl, formatClickAmount, getClickConfig } from "./click";
import { handleClick } from "./click-handler";
import { clickSign, clickSignTime } from "./click-sign";

export type PayState = { error: "not_configured" | "failed" | null };

async function siteOrigin(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function createPayment(lang: Lang): Promise<{ id: string; amountTiyin: number } | null> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect(`/${lang}/kirish?next=${encodeURIComponent(`/${lang}/mashq`)}`);

  const { data, error } = await supabase.rpc("create_practice_payment");
  const row = data as { id?: string; amount_tiyin?: number } | null;
  if (error || !row?.id || typeof row.amount_tiyin !== "number") {
    console.error(`create_practice_payment: ${error?.message ?? "bo'sh javob"}`);
    return null;
  }
  return { id: row.id, amountTiyin: row.amount_tiyin };
}

/** "Click orqali to'lash": to'lov yozuvi → my.click.uz */
export async function startClickPayment(lang: Lang): Promise<PayState> {
  if (!isLang(lang)) return { error: "failed" };
  const config = getClickConfig();
  if (!config) return { error: "not_configured" };

  const payment = await createPayment(lang);
  if (!payment) return { error: "failed" };

  const origin = await siteOrigin();
  redirect(
    buildClickPayUrl({
      serviceId: config.serviceId,
      merchantId: config.merchantId,
      amountTiyin: payment.amountTiyin,
      transactionParam: payment.id,
      returnUrl: `${origin}/${lang}/tolov/natija?id=${payment.id}`,
    }),
  );
}

/**
 * FAQAT LOKAL ISHLAB CHIQISH: Click serveri yuboradigan Prepare + Complete so'rovlarini
 * o'sha imzo bilan taqlid qiladi va xuddi shu bazaviy funksiyalardan o'tkazadi.
 * Production build'da (NODE_ENV=production) hech narsa qilmaydi.
 * Kerak: .env.local da CLICK_DEV_SECRET va CLICK_DEV_SERVICE_ID — Vault'dagi qiymatlar bilan bir xil.
 */
export async function simulateClickPayment(lang: Lang): Promise<PayState> {
  if (process.env.NODE_ENV !== "development" || !isLang(lang)) return { error: "failed" };
  const secret = process.env.CLICK_DEV_SECRET;
  const serviceId = process.env.CLICK_DEV_SERVICE_ID;
  if (!secret || !serviceId) return { error: "not_configured" };

  const payment = await createPayment(lang);
  if (!payment) return { error: "failed" };

  const clickTransId = String(Date.now());
  const amount = formatClickAmount(payment.amountTiyin);
  const signTime = clickSignTime(new Date());
  const common = {
    click_trans_id: clickTransId,
    service_id: serviceId,
    click_paydoc_id: String(Date.now() + 1),
    merchant_trans_id: payment.id,
    amount,
    error: "0",
    error_note: "Success",
    sign_time: signTime,
  };
  const sign = { clickTransId, serviceId, merchantTransId: payment.id, amount, signTime };

  const prepared = await handleClick("prepare", {
    ...common,
    action: "0",
    sign_string: clickSign({ ...sign, action: "0" }, secret),
  });
  if (prepared.error !== 0 || prepared.merchant_prepare_id === undefined) {
    console.error(`dev click prepare: ${prepared.error} ${prepared.error_note}`);
    return { error: "failed" };
  }
  const prepareId = String(prepared.merchant_prepare_id);
  const completed = await handleClick("complete", {
    ...common,
    action: "1",
    merchant_prepare_id: prepareId,
    sign_string: clickSign({ ...sign, action: "1", merchantPrepareId: prepareId }, secret),
  });
  if (completed.error !== 0) {
    console.error(`dev click complete: ${completed.error} ${completed.error_note}`);
    return { error: "failed" };
  }
  redirect(`/${lang}/tolov/natija?id=${payment.id}`);
}
