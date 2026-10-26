import type { Metadata } from "next";
import { CabinetView } from "@/features/cabinet/cabinet-view";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: `${t.meta.cabinetTitle} | vakil`, robots: { index: false } };
}

export default async function CabinetPage() {
  const { lang, t } = await getDictionary();
  return <CabinetView lang={lang} t={t} />;
}
