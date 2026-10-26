import type { Metadata } from "next";
import { PracticeGate } from "@/features/practice/practice-gate";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: `${t.meta.practiceTitle} | vakil`, robots: { index: false } };
}

export default async function PracticePage() {
  const { lang, t } = await getDictionary();
  return <PracticeGate lang={lang} t={t} />;
}
