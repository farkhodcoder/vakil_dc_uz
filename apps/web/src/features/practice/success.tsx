"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckIcon, DownloadIcon, ExternalIcon, LockIcon } from "@/components/icons";
import { dataUrlToBlob, downloadBlob } from "@/features/dv-photo/prepare-photo";
import { format } from "@/i18n/format";
import type { Dictionary } from "@/i18n/dictionaries/types";
import type { Lang } from "@/i18n/locales";
import { bilingual, LABEL_EN } from "./labels";
import { hasSpouse } from "./schema";
import type { PracticeData } from "./state";

export function SuccessView({ data, lang, t }: { data: PracticeData; lang: Lang; t: Dictionary }) {
  const s = t.practice.success;
  const [pdfState, setPdfState] = useState<"idle" | "building" | "failed">("idle");

  const photos: { key: string; label: string; file: string }[] = [
    { key: "entrant", label: bilingual("Entrant", t.labels.photo, lang), file: "dv-photo-entrant-600x600.jpg" },
  ];
  if (hasSpouse(data.form)) {
    photos.push({ key: "spouse", label: bilingual(LABEL_EN.spouse, t.labels.spouse, lang), file: "dv-photo-spouse-600x600.jpg" });
  }
  data.form.children.forEach((_, i) =>
    photos.push({
      key: `child-${i}`,
      label: bilingual(`${LABEL_EN.child} ${i + 1}`, format(t.practice.part2.childN, { n: i + 1 }), lang),
      file: `dv-photo-child-${i + 1}-600x600.jpg`,
    }),
  );

  const downloadPdf = async () => {
    setPdfState("building");
    try {
      const { buildPracticePdf } = await import("./pdf");
      downloadBlob(await buildPracticePdf(data, lang, t), "dv-practice-sample.pdf");
      setPdfState("idle");
    } catch {
      setPdfState("failed");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border border-ok/30 bg-ok-50 p-6 sm:p-8">
        <p className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-ok-ink sm:text-4xl">
          <span className="flex size-12 items-center justify-center rounded-full bg-ok text-white">
            <CheckIcon className="size-7" />
          </span>
          {s.title}
        </p>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink/80">{s.lead}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void downloadPdf()}
            disabled={pdfState === "building"}
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand px-6 font-bold text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {pdfState === "building" ? (
              <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <DownloadIcon />
            )}
            {pdfState === "building" ? s.pdfBuilding : s.pdf}
          </button>
        </div>
        {pdfState === "failed" && <p className="mt-3 font-semibold text-bad">{s.pdfFailed}</p>}
      </div>

      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h3 className="mb-3 font-extrabold text-brand">{s.photo}</h3>
        <ul className="flex flex-wrap gap-4">
          {photos.map((p) => {
            const photo = data.photos[p.key];
            if (!photo) return null;
            return (
              <li key={p.key} className="flex w-36 flex-col gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- data: URL, faqat qurilmada */}
                <img src={photo.dataUrl} alt="" className="aspect-square w-full rounded-xl border border-line object-cover" />
                <span className="text-xs font-semibold text-muted">{p.label}</span>
                <button
                  type="button"
                  onClick={() => downloadBlob(dataUrlToBlob(photo.dataUrl), p.file)}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-line-strong px-3 text-sm font-semibold text-brand hover:border-brand"
                >
                  <DownloadIcon className="size-4" />
                  JPEG
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h3 className="mb-3 font-extrabold text-brand">{s.nextTitle}</h3>
        <ol className="flex list-decimal flex-col gap-2 pl-5 leading-relaxed">
          {s.next.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <a
          href="https://dvprogram.state.gov/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-11 items-center gap-2 font-bold text-brand hover:underline"
        >
          dvprogram.state.gov
          <ExternalIcon />
        </a>
      </section>

      <p className="flex items-start gap-2.5 rounded-xl bg-warn-50 px-4 py-3 font-semibold text-warn">
        <LockIcon className="mt-0.5 size-5 shrink-0" />
        {s.keep}
      </p>

      <Link
        href={`/${lang}/mashq/`}
        className="inline-flex min-h-12 w-fit items-center rounded-full border border-line-strong px-6 font-bold text-brand hover:border-brand hover:bg-brand-50"
      >
        {s.again}
      </Link>
    </div>
  );
}
