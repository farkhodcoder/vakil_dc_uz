import Link from "next/link";
import {
  AlertIcon,
  ArrowRightIcon,
  CameraIcon,
  CheckIcon,
  CrossIcon,
  ExternalIcon,
  FileIcon,
  LockIcon,
  ShieldIcon,
} from "@/components/icons";
import { bilingual, LABEL_EN } from "@/features/practice/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatSum } from "@/i18n/locales";

/** Bosh sahifadagi namuna: rasmiy formadagi maydon, xato va tuzatilgan holat */
function FormPreview({ label, error, fixed }: { label: string; error: string; fixed: string }) {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-3 -rotate-2 rounded-[2rem] bg-brand/10" />
      <div className="relative flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5 shadow-lg sm:p-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">E-DV · 1. Name</span>
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand">DV-2027</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">{label}</span>
          <span className="flex min-h-12 items-center rounded-xl border-2 border-bad bg-surface px-3.5 font-semibold">ALISHER ULUGBEK</span>
          <span className="flex items-start gap-1.5 text-sm font-semibold text-bad">
            <CrossIcon className="mt-0.5 size-4 shrink-0" />
            {error}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">{label}</span>
          <span className="flex min-h-12 items-center justify-between rounded-xl border-2 border-ok bg-ok-50 px-3.5 font-semibold">
            ALISHER
            <CheckIcon className="size-5 text-ok-ink" />
          </span>
          <span className="text-sm font-semibold text-ok-ink">{fixed}</span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-paper p-3">
          <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface">
            <span className="absolute inset-x-0 top-[31%] h-[13%] border-y border-dashed border-ok bg-ok/15" />
            <span className="h-11 w-8 rounded-full border-2 border-brand/50" />
          </span>
          <span className="text-sm leading-snug text-muted">600×600 · JPEG · ≤ 240 KB · 50–69 %</span>
        </div>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const { lang, t } = await getDictionary();
  const h = t.home;
  const howIcons = [ShieldIcon, CheckIcon, CameraIcon, FileIcon];

  return (
    <>
      {/* ── Hero ── */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col items-start gap-6">
          <span className="rounded-full border border-brand/20 bg-brand-50 px-3.5 py-1.5 text-sm font-bold text-brand">{h.badge}</span>
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl">{h.title}</h1>
          <p className="max-w-xl text-lg leading-relaxed text-ink/75">{h.lead}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/${lang}/mashq/`}
              className="inline-flex min-h-14 items-center gap-2 rounded-full bg-brand px-7 text-lg font-extrabold text-white shadow-sm hover:bg-brand-hover"
            >
              {h.cta}
              <ArrowRightIcon />
            </Link>
            <a href="#how" className="inline-flex min-h-14 items-center rounded-full px-5 font-bold text-brand hover:bg-brand-50">
              {h.ctaSecondary}
            </a>
          </div>
          <p className="text-sm font-semibold text-muted">{h.priceNote}</p>
        </div>
        <FormPreview label={bilingual(LABEL_EN.firstName, t.labels.firstName, lang)} error={h.mockError} fixed={h.mockFixed} />
      </section>

      {/* ── Nima uchun ── */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight text-ink">{h.whyTitle}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {h.why.map((item) => (
              <div key={item.title} className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-bad-50 text-bad">
                  <AlertIcon />
                </span>
                <h3 className="text-lg font-extrabold leading-snug">{item.title}</h3>
                <p className="leading-relaxed text-ink/75">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Qanday ishlaydi ── */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 sm:px-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink">{h.howTitle}</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {h.how.map((step, i) => {
            const Icon = howIcons[i] ?? CheckIcon;
            return (
              <li key={step.title} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
                <span className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-white">
                    <Icon />
                  </span>
                  <span className="text-sm font-extrabold text-muted">0{i + 1}</span>
                </span>
                <h3 className="text-lg font-extrabold leading-snug">{step.title}</h3>
                <p className="leading-relaxed text-ink/75">{step.text}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ── Narx ── */}
      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-14 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col gap-4 rounded-3xl bg-brand p-7 text-white sm:p-9">
          <p className="font-bold text-white/80">{h.priceTitle}</p>
          <p className="flex items-baseline gap-2">
            <span className="text-6xl font-extrabold tracking-tight">{formatSum(999900)}</span>
            <span className="text-2xl font-bold text-white/80">{t.pay.currency}</span>
          </p>
          <p className="text-white/80">{h.perPractice}</p>
          <p className="rounded-2xl bg-white/10 p-4 text-sm leading-relaxed">{h.oncePerPayment}</p>
          <Link
            href={`/${lang}/mashq/`}
            className="mt-2 inline-flex min-h-14 w-fit items-center gap-2 rounded-full bg-white px-7 text-lg font-extrabold text-brand hover:bg-brand-50"
          >
            {h.cta}
            <ArrowRightIcon />
          </Link>
        </div>
        <ul className="grid content-start gap-3 sm:grid-cols-2">
          {h.included.map((item) => (
            <li key={item} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-ok text-white">
                <CheckIcon className="size-4" />
              </span>
              <span className="font-semibold leading-snug">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Maxfiylik va rasmiy sayt ── */}
      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-14 sm:px-6 md:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-2xl border border-ok/30 bg-ok-50 p-6">
          <span className="flex size-10 items-center justify-center rounded-xl bg-ok text-white">
            <LockIcon />
          </span>
          <h2 className="text-xl font-extrabold">{h.privacyTitle}</h2>
          <p className="leading-relaxed text-ink/80">{h.privacyText}</p>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand">
            <ExternalIcon className="size-5" />
          </span>
          <h2 className="text-xl font-extrabold">{h.officialTitle}</h2>
          <p className="leading-relaxed text-ink/80">{h.officialText}</p>
          <a
            href="https://dvprogram.state.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-fit items-center gap-2 font-bold text-brand hover:underline"
          >
            {h.officialLink}
            <ExternalIcon />
          </a>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mx-auto max-w-3xl px-4 pb-6 sm:px-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink">{h.faqTitle}</h2>
        <div className="mt-6 flex flex-col gap-3">
          {h.faq.map((item) => (
            <details key={item.q} className="group rounded-2xl border border-line bg-surface p-5 open:shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="text-xl text-brand transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 leading-relaxed text-ink/80">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
