import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentStatus } from "@/features/payment/payment-status";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: `${t.meta.paymentTitle} | vakil`, robots: { index: false } };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Status({ searchParams }: { searchParams: PageProps<"/[lang]/tolov/natija">["searchParams"] }) {
  const [{ lang, t }, sp] = await Promise.all([getDictionary(), searchParams]);
  const id = typeof sp.id === "string" && UUID.test(sp.id) ? sp.id : null;
  return <PaymentStatus paymentId={id} lang={lang} t={t.pay} />;
}

/** Click to'lovdan keyin shu sahifaga qaytaradi (return_url) */
export default function PaymentResultPage({ searchParams }: PageProps<"/[lang]/tolov/natija">) {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <Status searchParams={searchParams} />
    </Suspense>
  );
}
