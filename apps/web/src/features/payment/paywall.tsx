"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { CheckIcon, LockIcon } from "@/components/icons";
import { SuccessView } from "@/features/practice/success";
import { lastCompletedPractice, type PracticeData } from "@/features/practice/state";
import type { Dictionary } from "@/i18n/dictionaries/types";
import { formatSum, type Lang } from "@/i18n/locales";
import { BASE_PATH } from "@/lib/base-path";
import { getBrowserClient } from "@/lib/supabase/browser";
import { buildClickPayUrl, getClickConfig } from "./click";

const noopSubscribe = () => () => undefined;

/** Shu oynada yakunlangan oxirgi mashq (JSON satr — useSyncExternalStore uchun barqaror qiymat) */
function useLastCompleted(): PracticeData | null {
  const raw = useSyncExternalStore(
    noopSubscribe,
    () => {
      const last = lastCompletedPractice();
      return last ? JSON.stringify(last) : "";
    },
    () => "",
  );
  return useMemo(() => (raw ? (JSON.parse(raw) as PracticeData) : null), [raw]);
}

type PayError = "not_configured" | "failed" | null;

/** To'lov yozuvi (RLS: faqat o'z hisobiga) → my.click.uz. Click qaytgach /tolov/natija/ holatni kuzatadi. */
async function startClickPayment(lang: Lang): Promise<PayError> {
  const config = getClickConfig();
  if (!config) return "not_configured";
  const { data, error } = await getBrowserClient().rpc("create_practice_payment");
  const row = data as { id?: string; amount_tiyin?: number } | null;
  if (error || !row?.id || typeof row.amount_tiyin !== "number") return "failed";
  window.location.assign(
    buildClickPayUrl({
      serviceId: config.serviceId,
      merchantId: config.merchantId,
      amountTiyin: row.amount_tiyin,
      transactionParam: row.id,
      returnUrl: `${window.location.origin}${BASE_PATH}/${lang}/tolov/natija/?id=${row.id}`,
    }),
  );
  return null;
}

export function Paywall({ lang, t, priceTiyin }: { lang: Lang; t: Dictionary; priceTiyin: number }) {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<PayError>(null);
  const last = useLastCompleted();
  const [showLast, setShowLast] = useState(false);
  const p = t.pay;

  if (showLast && last) return <SuccessView data={last} lang={lang} t={t} />;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      {last && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ok/30 bg-ok-50 p-4">
          <p className="text-sm font-semibold text-ok-ink">{p.lastResult}</p>
          <button
            type="button"
            onClick={() => setShowLast(true)}
            className="inline-flex min-h-11 items-center rounded-full bg-ok px-4 text-sm font-bold text-white hover:brightness-95"
          >
            {p.lastResultButton}
          </button>
        </div>
      )}

      <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand sm:text-3xl">{p.title}</h1>
        <p className="mt-2 leading-relaxed text-ink/75">{p.lead}</p>

        <p className="mt-6 flex items-baseline gap-2">
          <span className="text-5xl font-extrabold tracking-tight text-ink">{formatSum(priceTiyin)}</span>
          <span className="text-xl font-bold text-muted">{p.currency}</span>
          <span className="ml-1 text-sm text-muted">/ {p.perPractice}</span>
        </p>

        <ul className="mt-5 flex flex-col gap-2">
          {p.included.map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-ok text-white">
                <CheckIcon className="size-3.5" />
              </span>
              {item}
            </li>
          ))}
        </ul>

        <button
          type="button"
          disabled={paying}
          onClick={async () => {
            setPaying(true);
            setError(null);
            const result = await startClickPayment(lang);
            // Muvaffaqiyatda sahifa Click'ga o'tadi; xato bo'lsa — shu yerda qolamiz
            if (result) {
              setError(result);
              setPaying(false);
            }
          }}
          className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-brand px-6 text-lg font-extrabold text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {paying && <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {paying ? p.redirecting : p.button}
        </button>
        <p className="mt-3 text-center text-xs text-muted">{p.offerAgree}</p>

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-warn/25 bg-warn-50 px-4 py-3 text-sm font-semibold text-warn">
            {error === "not_configured" ? p.notConfigured : p.failed}
          </p>
        )}
      </div>

      <p className="flex items-start gap-2.5 text-sm text-muted">
        <LockIcon className="mt-0.5 size-4 shrink-0" />
        {t.home.privacyText}
      </p>
    </div>
  );
}
