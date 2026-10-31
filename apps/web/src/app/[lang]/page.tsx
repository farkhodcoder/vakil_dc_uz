import Link from "next/link";
import { ArrowRightIcon, BookIcon, CheckIcon, FileIcon, ShieldIcon, SparkIcon } from "@/components/icons";
import { getDictionary } from "@/i18n/get-dictionary";

/** Bosh sahifa — xizmatlar katalogi */
export default async function HomePage() {
  const { lang, t } = await getDictionary();
  const c = t.catalog;
  const whyIcons = [CheckIcon, ShieldIcon, SparkIcon];

  return (
    <>
      {/* ── Hero ── */}
      <section className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 pb-12 pt-10 sm:px-6 sm:pt-16">
        <span className="rounded-full border border-brand/20 bg-brand-50 px-3.5 py-1.5 text-sm font-bold text-brand">{c.badge}</span>
        <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl">{c.title}</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-ink/75">{c.lead}</p>
      </section>

      {/* ── Xizmatlar ── */}
      <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-14 sm:px-6 md:grid-cols-2">
        <Link
          href={`/${lang}/green-card/`}
          className="group flex flex-col gap-4 rounded-3xl bg-brand p-7 text-white shadow-sm transition-shadow hover:shadow-lg sm:p-8"
        >
          <span className="flex items-center justify-between gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15">
              <FileIcon className="size-6" />
            </span>
            <span className="rounded-full bg-ok px-3 py-1 text-sm font-extrabold">{c.trend}</span>
          </span>
          <h2 className="text-2xl font-extrabold leading-snug">{c.dvTitle}</h2>
          <p className="leading-relaxed text-white/80">{c.dvText}</p>
          <span className="mt-auto inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-white px-6 font-extrabold text-brand group-hover:bg-brand-50">
            {c.dvCta}
            <ArrowRightIcon />
          </span>
        </Link>

        <Link
          href={`/${lang}/scopus/`}
          className="group flex flex-col gap-4 rounded-3xl border border-line bg-surface p-7 shadow-sm transition-shadow hover:shadow-lg sm:p-8"
        >
          <span className="flex items-center justify-between gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand">
              <BookIcon className="size-6" />
            </span>
            <span className="rounded-full bg-ok-50 px-3 py-1 text-sm font-extrabold text-ok-ink">{c.newBadge}</span>
          </span>
          <h2 className="text-2xl font-extrabold leading-snug text-ink">{c.scopusTitle}</h2>
          <p className="leading-relaxed text-ink/75">{c.scopusText}</p>
          <span className="mt-auto inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-brand px-6 font-extrabold text-white group-hover:bg-brand-hover">
            {c.scopusCta}
            <ArrowRightIcon />
          </span>
        </Link>

        <div className="flex flex-col gap-2 rounded-3xl border border-dashed border-line p-6 md:col-span-2">
          <h2 className="text-lg font-extrabold text-ink">{c.soonTitle}</h2>
          <p className="text-muted">{c.soonText}</p>
        </div>
      </section>

      {/* ── Nega vakil ── */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-ink">{c.whyTitle}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {c.why.map((item, i) => {
              const Icon = whyIcons[i] ?? CheckIcon;
              return (
                <div key={item.title} className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-white">
                    <Icon />
                  </span>
                  <h3 className="text-lg font-extrabold leading-snug">{item.title}</h3>
                  <p className="leading-relaxed text-ink/75">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
