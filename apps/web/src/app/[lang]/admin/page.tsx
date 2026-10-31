import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/admin-app";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = { title: "Admin | vakil", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const { lang, t } = await getDictionary();
  return <AdminApp lang={lang} t={t} />;
}
