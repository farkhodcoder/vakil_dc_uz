"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useRequiredUser } from "@/features/auth/use-session";
import { CheckIcon, CrossIcon } from "@/components/icons";
import type { Dictionary } from "@/i18n/dictionaries/types";
import type { Lang } from "@/i18n/locales";
import { getBrowserClient } from "@/lib/supabase/browser";

type View = "pending" | "paid" | "cancelled" | "slow" | "notFound";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POLL_MS = 2000;
const MAX_POLLS = 45; // ~1,5 daqiqa

/** Click'dan qaytgach: to'lov holatini (RLS — faqat o'z to'lovi) kuzatadi */
export function PaymentStatus({ paymentId, lang, t }: { paymentId: string | null; lang: Lang; t: Dictionary["pay"] }) {
  const [view, setView] = useState<View>(paymentId ? "pending" : "notFound");

  useEffect(() => {
    if (!paymentId) return;
    let stopped = false;
    let polls = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      const { data, error } = await getBrowserClient().from("payments").select("status").eq("id", paymentId).maybeSingle();
      if (stopped) return;
      polls++;
      if (!error && !data) return setView("notFound");
      if (data?.status === "paid") return setView("paid");
      if (data?.status === "cancelled") return setView("cancelled");
      if (polls >= MAX_POLLS) return setView("slow");
      timer = setTimeout(() => void poll(), POLL_MS);
    };
    void poll();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [paymentId]);

  const button = "inline-flex min-h-12 items-center justify-center rounded-full px-6 font-bold";

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:py-16">
      <div aria-live="polite" className="flex flex-col items-center gap-5 rounded-3xl border border-line bg-surface p-8 text-center shadow-sm">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand">{t.resultTitle}</h1>
        {view === "pending" && (
          <>
            <span className="size-10 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
            <p className="font-semibold">{t.pending}</p>
          </>
        )}
        {view === "paid" && (
          <>
            <span className="flex size-14 items-center justify-center rounded-full bg-ok text-white">
              <CheckIcon className="size-8" />
            </span>
            <p className="text-lg font-bold text-ok-ink">{t.paid}</p>
            <Link href={`/${lang}/mashq/`} className={`${button} bg-brand text-white hover:bg-brand-hover`}>
              {t.start}
            </Link>
          </>
        )}
        {view === "cancelled" && (
          <>
            <span className="flex size-14 items-center justify-center rounded-full bg-bad text-white">
              <CrossIcon className="size-8" />
            </span>
            <p className="font-semibold text-bad">{t.cancelled}</p>
            <Link href={`/${lang}/mashq/`} className={`${button} bg-brand text-white hover:bg-brand-hover`}>
              {t.retry}
            </Link>
          </>
        )}
        {(view === "slow" || view === "notFound") && (
          <>
            <p className="font-semibold">{view === "slow" ? t.slow : t.notFound}</p>
            <Link href={`/${lang}/kabinet/`} className={`${button} border border-line-strong text-brand hover:border-brand`}>
              {t.toCabinet}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

/** Click qaytaradigan sahifa (return_url): ?id=<payments.id>. Kirish talab qilinadi (RLS). */
export function PaymentStatusFromUrl({ lang, t }: { lang: Lang; t: Dictionary["pay"] }) {
  const params = useSearchParams();
  const raw = params.get("id");
  const id = raw && UUID.test(raw) ? raw : null;
  const user = useRequiredUser(lang, `/${lang}/tolov/natija/${id ? `?id=${id}` : ""}`);
  if (!user) return <div className="min-h-[60vh]" />;
  return <PaymentStatus paymentId={id} lang={lang} t={t} />;
}
