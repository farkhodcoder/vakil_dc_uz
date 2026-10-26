import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { COMPANY, value } from "@/content/company";
import { fillLegal, legalDoc, LEGAL_KINDS, type LegalKind } from "@/content/legal";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatSum } from "@/i18n/locales";

export async function generateStaticParams() {
  return LEGAL_KINDS.map((kind) => ({ kind }));
}

const isKind = (k: string): k is LegalKind => (LEGAL_KINDS as readonly string[]).includes(k);

export async function generateMetadata({ params }: PageProps<"/[lang]/hujjat/[kind]">): Promise<Metadata> {
  const [{ lang }, { kind }] = await Promise.all([getDictionary(), params]);
  if (!isKind(kind)) return {};
  return { title: `${legalDoc(lang, kind).doc.title} | vakil` };
}

export default async function LegalPage({ params }: PageProps<"/[lang]/hujjat/[kind]">) {
  const [{ lang }, { kind }] = await Promise.all([getDictionary(), params]);
  if (!isKind(kind)) notFound();
  const { doc, docLang } = legalDoc(lang, kind);
  const vars = {
    company: value(COMPANY.name),
    inn: value(COMPANY.inn),
    address: value(COMPANY.address),
    email: value(COMPANY.email),
    phone: value(COMPANY.phone),
    location: COMPANY.dataLocation,
    price: formatSum(999900),
    updated: COMPANY.updated,
  };
  const draft = COMPANY.name === null;

  return (
    <article lang={docLang === "uz" ? "uz-Latn" : docLang} className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-extrabold tracking-tight text-brand sm:text-4xl">{doc.title}</h1>
      <p className="mt-2 text-sm text-muted">
        {doc.updatedLabel}: {COMPANY.updated}
      </p>
      {draft && (
        <p className="mt-4 rounded-xl border border-warn/25 bg-warn-50 px-4 py-3 text-sm font-semibold text-warn">{doc.draftNote}</p>
      )}
      <div className="mt-8 flex flex-col gap-7">
        {doc.sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-lg font-extrabold text-ink">{s.h}</h2>
            {s.p.map((para) => (
              <p key={para} className="mt-2 leading-relaxed text-ink/85">
                {fillLegal(para, vars)}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
