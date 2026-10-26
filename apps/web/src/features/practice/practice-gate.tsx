"use client";

import { useEffect, useState } from "react";
import { useRequiredUser } from "@/features/auth/use-session";
import { Paywall } from "@/features/payment/paywall";
import type { Dictionary } from "@/i18n/dictionaries/types";
import type { Lang } from "@/i18n/locales";
import { getBrowserClient } from "@/lib/supabase/browser";
import { PracticeLoader } from "./practice-loader";

interface MyPractice {
  session_id: string | null;
  available: number;
  completed: number;
  price_tiyin: number;
}

function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <span className="size-8 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
    </div>
  );
}

/** /mashq: kirganmi → ochiq mashq bormi (RLS — faqat o'zinikini ko'radi) → mashq yoki to'lov */
export function PracticeGate({ lang, t }: { lang: Lang; t: Dictionary }) {
  const user = useRequiredUser(lang, `/${lang}/mashq/`);
  const [state, setState] = useState<MyPractice | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getBrowserClient()
      .rpc("my_practice")
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) setFailed(true);
        else setState(data as unknown as MyPractice);
      });
    return () => {
      active = false;
    };
  }, [user]);

  if (failed) {
    return (
      <p role="alert" className="mx-auto max-w-xl px-4 py-16 text-center font-semibold text-bad">
        {t.pay.failed}
      </p>
    );
  }
  if (!user || !state) return <Loading />;

  if (state.session_id) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <PracticeLoader sessionId={state.session_id} lang={lang} t={t} />
      </div>
    );
  }
  return (
    <div className="px-4 py-10 sm:py-14">
      <Paywall lang={lang} t={t} priceTiyin={state.price_tiyin} />
    </div>
  );
}
