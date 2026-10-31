import type { Metadata } from "next";
import { ArrowRightIcon, CheckIcon, CrossIcon, ShieldIcon } from "@/components/icons";
import { ScopusForm } from "@/features/scopus/scopus-form";
import type { ScopusPackage } from "@/i18n/dictionaries/types";
import { getDictionary } from "@/i18n/get-dictionary";

const PACKAGES: ScopusPackage[] = ["select", "edit", "full"];

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.scopus.metaTitle, description: t.scopus.metaDescription };
}

/** Scopus xizmati: bosqichlar, paketlar, halollik qoidalari va ariza */
export default async function ScopusPage() {
  const { lang, t } = await getDictionary();
  const s = t.scopus;

  return (
    <>
      {/* ── Hero ── */}
      <section className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 pb-14 pt-10 sm:px-6 sm:pt-16">
        <span className="rounded-full border border-brand/20 bg-brand-50 px-3.5 py-1.5 text-sm font-bold text-brand">{s.badge}</span>
        <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl">{s.title}</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-ink/75">{s.lead}</p>
        <a
          href="#ariza"
          className="inline-flex min-h-14 items-center gap-2 rounded-full bg-brand px-7 text-lg font-extrabold text-white shadow-sm hover:bg-brand-hover"
        >
          {s.cta}
          <ArrowRightIcon />
        </a>
      </section>

      {/* ── Bosqichlar ── */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-ink">{s.stepsTitle}</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {s.steps.map((step, i) => (
              <li key={step.title} className="flex flex-col gap-2 rounded-2xl border border-line bg-paper p-5">
                <span className="text-sm font-extrabold text-brand">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="text-lg font-extrabold leading-snug">{step.title}</h3>
                <p className="leading-relaxed text-ink/75">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Paketlar ── */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink">{s.packagesTitle}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {PACKAGES.map((p) => {
            const pkg = s.packages[p];
            const featured = p === "full";
            return (
              <div
                key={p}
                className={`flex flex-col gap-3 rounded-3xl p-6 ${featured ? "bg-brand text-white" : "border border-line bg-surface"}`}
              >
                <h3 className="text-xl font-extrabold">{pkg.name}</h3>
                <p className={featured ? "text-white/80" : "text-ink/75"}>{pkg.text}</p>
                <ul className="mt-1 flex flex-col gap-2">
                  {pkg.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 font-semibold">
                      <span
                        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${featured ? "bg-white/20" : "bg-ok text-white"}`}
                      >
                        <CheckIcon className="size-3.5" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="mt-5 rounded-2xl bg-brand-50 p-4 font-semibold text-brand">{s.priceNote}</p>
      </section>

      {/* ── Halollik ── */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-ok text-white">
            <ShieldIcon />
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-ink">{s.rulesTitle}</h2>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <ul className="flex flex-col gap-3 rounded-2xl border border-ok/30 bg-ok-50 p-5">
            {s.rulesYes.map((rule) => (
              <li key={rule} className="flex items-start gap-2.5 font-semibold leading-snug">
                <CheckIcon className="mt-0.5 size-5 shrink-0 text-ok-ink" />
                {rule}
              </li>
            ))}
          </ul>
          <ul className="flex flex-col gap-3 rounded-2xl border border-bad/25 bg-bad-50 p-5">
            {s.rulesNo.map((rule) => (
              <li key={rule} className="flex items-start gap-2.5 font-semibold leading-snug">
                <CrossIcon className="mt-0.5 size-5 shrink-0 text-bad" />
                {rule}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Ariza ── */}
      <section id="ariza" className="mx-auto max-w-3xl scroll-mt-24 px-4 pb-6 sm:px-6">
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-ink">{s.formTitle}</h2>
          <p className="mb-6 mt-2 leading-relaxed text-ink/75">{s.formLead}</p>
          <ScopusForm lang={lang} t={t} />
        </div>
      </section>
    </>
  );
}
