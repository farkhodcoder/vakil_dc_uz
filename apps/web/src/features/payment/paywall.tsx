"use client";

import { useActionState, useMemo, useState, useSyncExternalStore } from "react";
import { CheckIcon, LockIcon } from "@/components/icons";
import { SuccessView } from "@/features/practice/success";
import { lastCompletedPractice, type PracticeData } from "@/features/practice/state";
import type { Dictionary } from "@/i18n/dictionaries/types";
import { formatSum, type Lang } from "@/i18n/locales";
import { simulateClickPayment, startClickPayment, type PayState } from "./actions";

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

const initial: PayState = { error: null };

export function Paywall({
  lang,
  t,
  priceTiyin,
  devPayment,
}: {
  lang: Lang;
  t: Dictionary;
  priceTiyin: number;
  devPayment: boolean;
}) {
  const [state, payAction, paying] = useActionState(startClickPayment.bind(null, lang), initial);
  const [devState, devAction, devPaying] = useActionState(simulateClickPayment.bind(null, lang), initial);
  const last = useLastCompleted();
  const [showLast, setShowLast] = useState(false);
  const p = t.pay;
  const error = state.error ?? devState.error;

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

        <form action={payAction} className="mt-6">
          <button
            type="submit"
            disabled={paying || devPaying}
            className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-brand px-6 text-lg font-extrabold text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {paying && <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {paying ? p.redirecting : p.button}
          </button>
        </form>
        <p className="mt-3 text-center text-xs text-muted">{p.offerAgree}</p>

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-warn/25 bg-warn-50 px-4 py-3 text-sm font-semibold text-warn">
            {error === "not_configured" ? p.notConfigured : p.failed}
          </p>
        )}

        {devPayment && (
          <form action={devAction} className="mt-5 border-t border-dashed border-line-strong pt-4">
            <button
              type="submit"
              disabled={paying || devPaying}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-dashed border-warn px-4 text-sm font-semibold text-warn hover:bg-warn-50 disabled:opacity-60"
            >
              {p.devButton}
            </button>
            <p className="mt-2 text-xs text-muted">{p.devNote}</p>
          </form>
        )}
      </div>

      <p className="flex items-start gap-2.5 text-sm text-muted">
        <LockIcon className="mt-0.5 size-4 shrink-0" />
        {t.home.privacyText}
      </p>
    </div>
  );
}
