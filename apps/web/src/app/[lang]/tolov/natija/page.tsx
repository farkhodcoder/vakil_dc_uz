import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentStatusFromUrl } from "@/features/payment/payment-status";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: `${t.meta.paymentTitle} | vakil`, robots: { index: false } };
}

/** Click to'lovdan keyin shu sahifaga qaytaradi (return_url: /{til}/tolov/natija/?id=…) */
export default async function PaymentResultPage() {
  const { lang, t } = await getDictionary();
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <PaymentStatusFromUrl lang={lang} t={t.pay} />
    </Suspense>
  );
}
