"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, LockIcon } from "@/components/icons";
import { PhotoCapture } from "@/features/dv-photo/photo-capture";
import { photoState, type StoredPhoto } from "@/features/dv-photo/stored-photo";
import type { Dictionary } from "@/i18n/dictionaries/types";
import type { Lang } from "@/i18n/locales";
import { getBrowserClient } from "@/lib/supabase/browser";
import { FormProvider } from "./fields";
import { ReviewStep } from "./review";
import { hasSpouse, type DvForm } from "./schema";
import { clearPractice, loadPractice, newPractice, savePractice, todayIso, type PracticeData } from "./state";
import { Part1Step, Part2Step, PassportStep } from "./steps";
import { SuccessView } from "./success";
import { countByStep, fieldDomId, STEPS, validatePractice, type Issue, type PhotoState, type StepId } from "./validate";

/** Olib tashlangan oila a'zolarining fotolari o'chiriladi */
function prunePhotos(photos: PracticeData["photos"], form: DvForm): PracticeData["photos"] {
  const keep = new Set(["entrant", ...(hasSpouse(form) ? ["spouse"] : []), ...form.children.map((_, i) => `child-${i}`)]);
  return Object.fromEntries(Object.entries(photos).filter(([k]) => keep.has(k)));
}

function Stepper({
  current,
  onSelect,
  counts,
  checked,
  t,
}: {
  current: StepId;
  onSelect: (s: StepId) => void;
  counts: ReturnType<typeof countByStep>;
  checked: boolean;
  t: Dictionary;
}) {
  return (
    <nav aria-label={t.practice.review.title} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ol className="flex min-w-max gap-2">
        {STEPS.map((step, i) => {
          const active = step === current;
          const errors = checked ? counts[step].errors : 0;
          return (
            <li key={step}>
              <button
                type="button"
                onClick={() => onSelect(step)}
                aria-current={active ? "step" : undefined}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-sm font-bold transition-colors ${
                  active ? "border-brand bg-brand text-white" : "border-line-strong bg-surface text-ink hover:border-brand"
                }`}
              >
                <span
                  className={`flex size-6 items-center justify-center rounded-full text-xs ${
                    active ? "bg-white/20" : "bg-paper text-muted"
                  }`}
                >
                  {i + 1}
                </span>
                {t.practice.steps[step]}
                {errors > 0 && (
                  <span className="flex min-w-6 items-center justify-center rounded-full bg-bad px-1.5 text-xs text-white">
                    {errors}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default function PracticeApp({ sessionId, lang, t }: { sessionId: string; lang: Lang; t: Dictionary }) {
  // Faqat brauzerda render qilinadi (ssr: false) — sessionStorage'dan to'g'ridan-to'g'ri o'qish xavfsiz
  const [data, setData] = useState<PracticeData>(() => loadPractice(sessionId) ?? newPractice(sessionId));
  const dataRef = useRef(data);
  const [storageOk, setStorageOk] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [focus, setFocus] = useState<{ field: string; at: number } | null>(null);
  const today = useMemo(() => todayIso(), []);
  const topRef = useRef<HTMLDivElement>(null);

  const update = useCallback((fn: (d: PracticeData) => PracticeData) => {
    const next = fn(dataRef.current);
    dataRef.current = next;
    setData(next);
    setStorageOk(savePractice(next));
  }, []);

  const photoStates = useMemo(() => {
    const out: Partial<Record<string, PhotoState>> = {};
    for (const [k, v] of Object.entries(data.photos)) {
      const s = photoState(v);
      if (s) out[k] = s;
    }
    return out;
  }, [data.photos]);

  const issues = useMemo(
    () => validatePractice({ passport: data.passport, scan: data.scan, form: data.form, photos: photoStates, today }),
    [data.passport, data.scan, data.form, photoStates, today],
  );
  const counts = useMemo(() => countByStep(issues), [issues]);

  // Xatoga o'tish: qadam almashgach maydonni topib, ko'rsatib, fokus beramiz
  useEffect(() => {
    if (!focus) return;
    const raf = requestAnimationFrame(() => {
      const el =
        document.getElementById(fieldDomId(focus.field)) ??
        document.querySelector<HTMLElement>(`[data-field="${CSS.escape(focus.field)}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus({ preventScroll: true });
      const box = el.closest<HTMLElement>("[data-field]") ?? el;
      box.classList.remove("field-flash");
      void box.offsetWidth; // animatsiyani qayta boshlash
      box.classList.add("field-flash");
    });
    return () => cancelAnimationFrame(raf);
  }, [focus, data.step]);

  const goStep = useCallback(
    (step: StepId) => {
      update((d) => ({ ...d, step }));
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [update],
  );

  const fix = useCallback(
    (issue: Issue) => {
      update((d) => ({ ...d, step: issue.step }));
      setFocus({ field: issue.field, at: Date.now() });
    },
    [update],
  );

  const setForm = useCallback(
    (form: DvForm) => update((d) => ({ ...d, form, photos: prunePhotos(d.photos, form) })),
    [update],
  );
  const setPhoto = useCallback(
    (key: string, photo: StoredPhoto | null) => update((d) => ({ ...d, photos: { ...d.photos, [key]: photo } })),
    [update],
  );

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(false);
    const { error } = await getBrowserClient().rpc("complete_practice", { p_session_id: sessionId });
    setSubmitting(false);
    if (error) {
      setSubmitError(true);
      return;
    }
    update((d) => ({ ...d, completedAt: new Date().toISOString() }));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (data.completedAt) {
    return (
      <div ref={topRef} className="scroll-mt-24">
        <SuccessView data={data} lang={lang} t={t} />
      </div>
    );
  }

  const stepIndex = STEPS.indexOf(data.step);
  const prev = STEPS[stepIndex - 1];
  const next = STEPS[stepIndex + 1];
  const stepTitle: Record<StepId, string> = {
    passport: t.practice.passport.title,
    photo: t.practice.photo.title,
    part1: t.practice.part1.title,
    part2: t.practice.part2.title,
    review: t.practice.review.title,
  };
  const stepLead: Record<StepId, string> = {
    passport: t.practice.passport.lead,
    photo: t.practice.photo.lead,
    part1: t.practice.part1.lead,
    part2: t.practice.part2.lead,
    review: "",
  };

  return (
    <FormProvider value={{ lang, t, issues, showIssues: data.checked, readOnly: false }}>
      <div ref={topRef} className="flex scroll-mt-24 flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-start gap-2 text-sm text-muted">
            <LockIcon className="mt-0.5 size-4 shrink-0" />
            {t.practice.localOnly}
          </p>
          <button
            type="button"
            onClick={() => {
              if (!window.confirm(t.practice.clearConfirm)) return;
              clearPractice(sessionId);
              update(() => newPractice(sessionId));
            }}
            className="min-h-11 text-sm font-semibold text-bad hover:underline"
          >
            {t.practice.clear}
          </button>
        </div>

        {!storageOk && (
          <p role="alert" className="rounded-xl border border-warn/25 bg-warn-50 px-4 py-3 text-sm font-semibold text-warn">
            {t.practice.storageFull}
          </p>
        )}

        <Stepper current={data.step} onSelect={goStep} counts={counts} checked={data.checked} t={t} />

        <header>
          <h2 className="text-2xl font-extrabold tracking-tight text-brand sm:text-3xl">{stepTitle[data.step]}</h2>
          {stepLead[data.step] && <p className="mt-2 max-w-3xl leading-relaxed text-ink/75">{stepLead[data.step]}</p>}
        </header>

        {data.step === "passport" && (
          <PassportStep
            passport={data.passport}
            scan={data.scan}
            onPassport={(passport) => update((d) => ({ ...d, passport }))}
            onScan={(scan) => update((d) => ({ ...d, scan }))}
          />
        )}
        {data.step === "photo" && (
          <div data-field="photo.entrant" id={fieldDomId("photo.entrant")} tabIndex={-1} className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
            <PhotoCapture
              value={data.photos.entrant ?? null}
              onChange={(p) => setPhoto("entrant", p)}
              lang={lang}
              t={t}
              downloadName="dv-photo-entrant-600x600.jpg"
            />
          </div>
        )}
        {data.step === "part1" && (
          <Part1Step form={data.form} onForm={setForm} entrantPhoto={data.photos.entrant ?? null} onGoPhoto={() => goStep("photo")} />
        )}
        {data.step === "part2" && <Part2Step form={data.form} onForm={setForm} photos={data.photos} onPhoto={setPhoto} />}
        {data.step === "review" && (
          <ReviewStep
            issues={issues}
            checked={data.checked}
            onCheck={() => update((d) => ({ ...d, checked: true }))}
            onFix={fix}
            onSubmit={() => void submit()}
            submitting={submitting}
            submitError={submitError}
            t={t}
            lang={lang}
          />
        )}

        <div className="flex items-center justify-between gap-3 border-t border-line pt-5">
          {prev ? (
            <button
              type="button"
              onClick={() => goStep(prev)}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line-strong px-5 font-semibold text-brand hover:border-brand"
            >
              <ArrowLeftIcon />
              {t.practice.back}
            </button>
          ) : (
            <span />
          )}
          {next && (
            <button
              type="button"
              onClick={() => goStep(next)}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand px-6 font-bold text-white hover:bg-brand-hover"
            >
              {next === "review" ? t.practice.steps.review : t.practice.next}
              <ArrowRightIcon />
            </button>
          )}
        </div>
      </div>
    </FormProvider>
  );
}
