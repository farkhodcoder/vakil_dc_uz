import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Paywall } from "@/features/payment/paywall";
import { PracticeLoader } from "@/features/practice/practice-loader";
import { getDictionary } from "@/i18n/get-dictionary";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: `${t.meta.practiceTitle} | vakil`, robots: { index: false } };
}

interface MyPractice {
  session_id: string | null;
  available: number;
  completed: number;
  price_tiyin: number;
}

/** Lokal sinov to'lovi tugmasi: faqat development va .env.local da CLICK_DEV_* bo'lsa */
const devPaymentEnabled = () =>
  process.env.NODE_ENV === "development" && Boolean(process.env.CLICK_DEV_SECRET && process.env.CLICK_DEV_SERVICE_ID);

async function PracticeGate() {
  const { lang, t } = await getDictionary();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect(`/${lang}/kirish?next=${encodeURIComponent(`/${lang}/mashq`)}`);

  const { data, error } = await supabase.rpc("my_practice");
  if (error) throw new Error(`my_practice: ${error.message}`);
  const state = data as unknown as MyPractice;

  if (state.session_id) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <PracticeLoader sessionId={state.session_id} lang={lang} t={t} />
      </div>
    );
  }
  return (
    <div className="px-4 py-10 sm:py-14">
      <Paywall lang={lang} t={t} priceTiyin={state.price_tiyin} devPayment={devPaymentEnabled()} />
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <span className="size-8 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
        </div>
      }
    >
      <PracticeGate />
    </Suspense>
  );
}
