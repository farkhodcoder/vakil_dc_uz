"use client";

import { useCallback, useId, useRef, useState } from "react";
import type { RuleCheck, RuleOutcome, Verdict } from "@vakil/dv-photo";
import {
  AlertIcon,
  CameraIcon,
  CheckIcon,
  CrossIcon,
  DownloadIcon,
  LockIcon,
  MinusIcon,
  UploadIcon,
} from "@/components/icons";
import type { Dictionary } from "@/i18n/dictionaries/types";
import { PHOTO_LOCALE, type Lang } from "@/i18n/locales";
import { loadEngine } from "./analyze-photo";
import { CameraCapture } from "./camera";
import { blobToDataUrl, dataUrlToBlob, downloadBlob, preparePhoto } from "./prepare-photo";
import { photoReport, type StoredPhoto } from "./stored-photo";

type Status = "idle" | "loading" | "analyzing" | "error";

const OUTCOME_STYLE: Record<RuleOutcome, { box: string; icon: string; Icon: typeof CheckIcon }> = {
  pass: { box: "border-ok/30 bg-ok-50", icon: "bg-ok text-white", Icon: CheckIcon },
  fail: { box: "border-bad/25 bg-bad-50", icon: "bg-bad text-white", Icon: CrossIcon },
  warn: { box: "border-warn/25 bg-warn-50", icon: "bg-warn text-white", Icon: AlertIcon },
  skip: { box: "border-line bg-paper", icon: "bg-line-strong text-white", Icon: MinusIcon },
};

const VERDICT_STYLE: Record<Verdict, string> = {
  pass: "bg-ok-50 text-ok-ink border-ok/30",
  review: "bg-brand-50 text-brand border-brand/20",
  fail: "bg-bad-50 text-bad border-bad/25",
};

function Preview({ photo, t }: { photo: StoredPhoto; t: Dictionary["photoUi"] }) {
  const f = photo.facts;
  const pct = (y: number) => `${(y / f.height) * 100}%`;
  return (
    <figure className="flex flex-col gap-2">
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-sm"
        style={{ aspectRatio: `${f.width} / ${f.height}` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- data: URL, faqat qurilmadagi oldindan ko'rish */}
        <img src={photo.dataUrl} alt="" className="absolute inset-0 size-full" />
        {f.faceCount === 1 && (
          <div className="absolute inset-x-0 border-y-2 border-dashed border-ok bg-ok/15" style={{ top: "31%", height: "13%" }} />
        )}
        {f.headTopY != null && <div className="absolute inset-x-0 border-t-2 border-brand" style={{ top: pct(f.headTopY) }} />}
        {f.chinY != null && <div className="absolute inset-x-0 border-t-2 border-brand" style={{ top: pct(f.chinY) }} />}
        {f.eyeY != null && (
          <div
            className="absolute left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ok shadow"
            style={{ top: pct(f.eyeY) }}
          />
        )}
      </div>
      {f.faceCount === 1 && (
        <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-brand" /> {t.legendHead}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-4 border-y border-dashed border-ok bg-ok/20" /> {t.legendEyes}
          </span>
        </figcaption>
      )}
    </figure>
  );
}

function CheckRow({ check, lang, t }: { check: RuleCheck; lang: Lang; t: Dictionary["photoUi"] }) {
  const style = OUTCOME_STYLE[check.outcome];
  const hint = check.outcome === "fail" || check.outcome === "warn" ? check.fixHint : undefined;
  const loc = PHOTO_LOCALE[lang];
  return (
    <li className={`flex gap-3 rounded-xl border p-3 ${style.box}`}>
      <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${style.icon}`}>
        <style.Icon className="size-4" />
        <span className="sr-only">{t.outcome[check.outcome]}</span>
      </span>
      <div className="min-w-0">
        <p className="font-semibold leading-snug">{check.message[loc]}</p>
        {hint && (
          <p className="mt-1 text-sm leading-relaxed text-ink/80">
            <span className="font-semibold">{t.howToFix}: </span>
            {hint[loc]}
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * Foto: kamera yoki fayl → tahlil → avto-kesish → tekshiruv natijasi.
 * value/onChange — mashq holatida (brauzerda) saqlanadi.
 */
export function PhotoCapture({
  value,
  onChange,
  lang,
  t,
  downloadName,
  readOnly = false,
}: {
  value: StoredPhoto | null;
  onChange: (next: StoredPhoto | null) => void;
  lang: Lang;
  t: Dictionary;
  downloadName: string;
  readOnly?: boolean;
}) {
  const ui = t.photoUi;
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [camera, setCamera] = useState(false);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const warmUp = useCallback(() => {
    void loadEngine().catch(() => undefined);
  }, []);

  const handleBlob = useCallback(
    async (blob: Blob) => {
      setCamera(false);
      setError(null);
      setStatus("loading");
      try {
        await loadEngine();
      } catch {
        setStatus("error");
        setError(ui.errorEngine);
        return;
      }
      setStatus("analyzing");
      try {
        const prepared = await preparePhoto(blob);
        onChange({
          dataUrl: await blobToDataUrl(prepared.blob),
          facts: prepared.facts,
          mode: prepared.mode,
          ...(prepared.cropFailure ? { cropFailure: prepared.cropFailure } : {}),
          ...(prepared.lowResolution ? { lowResolution: true } : {}),
          confirmed: {},
        });
        setStatus("idle");
      } catch {
        setStatus("error");
        setError(ui.errorRead);
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onChange, ui],
  );

  const busy = status === "loading" || status === "analyzing";
  const report = value ? photoReport(value) : null;
  const verdict: Verdict | null = value && report ? (value.mode === "unprocessed" ? "fail" : report.verdict) : null;
  const allConfirmed = value && report ? report.selfChecks.every((s) => value.confirmed[s.code]) : false;

  const actions = !readOnly && (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => {
          warmUp();
          setCamera(true);
        }}
        disabled={busy}
        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand px-5 font-bold text-white hover:bg-brand-hover disabled:opacity-50"
      >
        <CameraIcon />
        {value ? ui.retake : ui.camera}
      </button>
      <label
        htmlFor={inputId}
        onPointerEnter={warmUp}
        className={`inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-surface px-5 font-semibold text-brand hover:border-brand hover:bg-brand-50 ${
          busy ? "pointer-events-none opacity-50" : ""
        }`}
      >
        <UploadIcon className="size-5" />
        {value ? ui.another : ui.upload}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleBlob(file);
        }}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {camera && <CameraCapture t={t.camera} onCapture={(b) => void handleBlob(b)} onClose={() => setCamera(false)} />}

      {!value && !busy && (
        <div className="grid gap-5 md:grid-cols-[1fr_minmax(0,280px)]">
          <div className="flex flex-col gap-4">
            <p className="flex items-start gap-2.5 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand">
              <LockIcon className="mt-0.5 size-4 shrink-0" />
              <span>{t.practice.localOnly}</span>
            </p>
            {actions}
          </div>
          <div className="rounded-2xl border border-line bg-paper p-4">
            <p className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{ui.rulesTitle}</p>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed">
              {ui.rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {busy && (
        <p aria-live="polite" className="flex items-center gap-3 font-semibold text-brand">
          <span className="size-5 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
          {status === "loading" ? ui.loadingEngine : ui.analyzing}
        </p>
      )}

      {error && (
        <p role="alert" className="flex items-start gap-2.5 rounded-xl border border-bad/25 bg-bad-50 px-4 py-3 font-semibold text-bad">
          <CrossIcon className="mt-0.5 size-5 shrink-0" />
          {error}
        </p>
      )}

      {value && report && verdict && !busy && (
        <div className="grid gap-6 md:grid-cols-[minmax(0,260px)_1fr] md:gap-8">
          <div className="flex flex-col gap-3">
            <Preview photo={value} t={ui} />
            {value.mode !== "unprocessed" && (
              <button
                type="button"
                onClick={() => downloadBlob(dataUrlToBlob(value.dataUrl), downloadName)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line-strong px-4 text-sm font-semibold text-brand hover:border-brand hover:bg-brand-50"
              >
                <DownloadIcon className="size-4" />
                {ui.download}
              </button>
            )}
          </div>

          <div aria-live="polite" className="flex min-w-0 flex-col gap-4">
            <p className={`rounded-2xl border px-5 py-4 text-lg font-bold leading-snug ${VERDICT_STYLE[verdict]}`}>
              {ui.verdict[verdict]}
            </p>
            {value.mode === "cropped" && <p className="text-sm font-semibold text-ok-ink">{ui.autoPrepared}</p>}
            {value.mode === "original" && <p className="text-sm font-semibold text-ok-ink">{ui.original}</p>}
            {value.cropFailure && (
              <p className="rounded-xl border border-bad/25 bg-bad-50 px-4 py-3 text-sm font-semibold text-bad">
                {ui.cropFail[value.cropFailure]}
              </p>
            )}
            {value.lowResolution && (
              <p className="rounded-xl border border-warn/25 bg-warn-50 px-4 py-3 text-sm font-semibold text-warn">{ui.lowRes}</p>
            )}

            <section>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{ui.autoTitle}</h3>
              <ul className="flex flex-col gap-2">
                {report.checks.map((c) => (
                  <CheckRow key={c.code} check={c} lang={lang} t={ui} />
                ))}
              </ul>
            </section>

            {value.mode !== "unprocessed" && report.selfChecks.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{ui.selfTitle}</h3>
                <ul className="flex flex-col gap-2">
                  {report.selfChecks.map((s) => (
                    <li key={s.code}>
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2 hover:bg-paper">
                        <input
                          type="checkbox"
                          disabled={readOnly}
                          checked={Boolean(value.confirmed[s.code])}
                          onChange={(e) => onChange({ ...value, confirmed: { ...value.confirmed, [s.code]: e.target.checked } })}
                          className="size-5 shrink-0 accent-[#1b3b6f]"
                        />
                        <span className="font-medium">{s.label[PHOTO_LOCALE[lang]]}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                {allConfirmed && (
                  <p className="mt-2 flex items-center gap-2 font-semibold text-ok-ink">
                    <CheckIcon className="size-5" /> {ui.selfDone}
                  </p>
                )}
              </section>
            )}

            {actions}
            <div className="flex flex-col gap-1 border-t border-line pt-3 text-sm text-muted">
              <p>{ui.noEdit}</p>
              <p>{ui.disclaimer}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
