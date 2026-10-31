"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CheckIcon, LockIcon } from "@/components/icons";
import type { Dictionary, ScopusPackage, ScopusStage, ScopusTarget } from "@/i18n/dictionaries/types";
import type { Lang } from "@/i18n/locales";
import { getBrowserClient } from "@/lib/supabase/browser";

const PACKAGES: ScopusPackage[] = ["select", "edit", "full"];
const STAGES: ScopusStage[] = ["idea", "draft", "ready", "revision"];
const TARGETS: ScopusTarget[] = ["any", "q1q2", "q3q4"];
// Bazadagi cheklovlar bilan bir xil (0018_scopus_requests.sql)
const REQUIRED = { field: 2, title: 3, language: 2, contact: 3 } as const;

const inputBase =
  "min-h-12 w-full rounded-xl border bg-surface px-3.5 text-base text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none";

type Values = {
  package: ScopusPackage;
  field: string;
  title: string;
  stage: ScopusStage | "";
  target: ScopusTarget;
  language: string;
  deadline: string;
  contact: string;
  message: string;
};

const EMPTY: Values = {
  package: "full",
  field: "",
  title: "",
  stage: "",
  target: "any",
  language: "",
  deadline: "",
  contact: "",
  message: "",
};

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5" data-field={id}>
      <label htmlFor={id} className="text-sm font-bold text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <span className="text-sm text-muted">{hint}</span>}
      {error && <span className="text-sm font-semibold text-bad">{error}</span>}
    </div>
  );
}

/** Scopus ariza formasi: faqat kirgan foydalanuvchi uchun, rpc create_scopus_request */
export function ScopusForm({ lang, t }: { lang: Lang; t: Dictionary }) {
  const s = t.scopus;
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [v, setV] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserClient();
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => sub.subscription.unsubscribe();
  }, []);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setV((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Partial<Record<keyof Values, string>> = {};
    for (const [key, min] of Object.entries(REQUIRED) as [keyof typeof REQUIRED, number][]) {
      if (v[key].trim().length < min) next[key] = s.required;
    }
    if (!v.stage) next.stage = s.required;
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      document.getElementById(`sc-${first}`)?.focus();
      return;
    }

    setState("sending");
    setFailure(null);
    const { error } = await getBrowserClient().rpc("create_scopus_request", { p: v });
    if (error) {
      setState("idle");
      setFailure(error.message.includes("too_many_requests") ? s.tooMany : s.failed);
      return;
    }
    setState("sent");
  }

  if (signedIn === null) {
    return <div className="h-40" aria-hidden="true" />;
  }

  if (!signedIn) {
    const next = `/${lang}/scopus/`;
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-line bg-paper p-6">
        <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand">
          <LockIcon />
        </span>
        <p className="font-semibold text-ink">{s.loginToApply}</p>
        <Link
          href={`/${lang}/kirish/?next=${encodeURIComponent(next)}`}
          className="inline-flex min-h-12 items-center rounded-full bg-brand px-6 font-bold text-white hover:bg-brand-hover"
        >
          {t.nav.login}
        </Link>
      </div>
    );
  }

  if (state === "sent") {
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-ok/30 bg-ok-50 p-6" role="status">
        <span className="flex size-10 items-center justify-center rounded-full bg-ok text-white">
          <CheckIcon />
        </span>
        <h3 className="text-xl font-extrabold text-ink">{s.sentTitle}</h3>
        <p className="leading-relaxed text-ink/80">{s.sentLead}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/${lang}/kabinet/`}
            className="inline-flex min-h-12 items-center rounded-full bg-brand px-6 font-bold text-white hover:bg-brand-hover"
          >
            {t.nav.cabinet}
          </Link>
          <button
            type="button"
            onClick={() => {
              setV({ ...EMPTY, package: v.package });
              setState("idle");
            }}
            className="inline-flex min-h-12 items-center rounded-full px-5 font-bold text-brand hover:bg-brand-50"
          >
            {s.another}
          </button>
        </div>
      </div>
    );
  }

  const cls = (key: keyof Values) => `${inputBase} ${errors[key] ? "border-bad" : "border-line-strong"}`;
  const f = s.fields;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-bold text-ink">{f.package}</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {PACKAGES.map((p) => (
            <label
              key={p}
              className={`flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border-2 px-3.5 font-semibold ${
                v.package === p ? "border-brand bg-brand-50 text-brand" : "border-line bg-surface text-ink"
              }`}
            >
              <input type="radio" name="package" value={p} checked={v.package === p} onChange={() => set("package", p)} className="accent-brand" />
              {s.packages[p].name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="sc-field" label={f.field} hint={f.fieldHint} error={errors.field}>
          <input id="sc-field" className={cls("field")} value={v.field} maxLength={120} onChange={(e) => set("field", e.target.value)} />
        </Field>
        <Field id="sc-language" label={f.language} error={errors.language}>
          <input id="sc-language" className={cls("language")} value={v.language} maxLength={40} onChange={(e) => set("language", e.target.value)} />
        </Field>
      </div>

      <Field id="sc-title" label={f.title} error={errors.title}>
        <input id="sc-title" className={cls("title")} value={v.title} maxLength={300} onChange={(e) => set("title", e.target.value)} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="sc-stage" label={f.stage} error={errors.stage}>
          <select id="sc-stage" className={cls("stage")} value={v.stage} onChange={(e) => set("stage", e.target.value as ScopusStage | "")}>
            <option value="">{t.practice.select}</option>
            {STAGES.map((st) => (
              <option key={st} value={st}>
                {s.stages[st]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="sc-target" label={f.target}>
          <select id="sc-target" className={cls("target")} value={v.target} onChange={(e) => set("target", e.target.value as ScopusTarget)}>
            {TARGETS.map((tg) => (
              <option key={tg} value={tg}>
                {s.targets[tg]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="sc-contact" label={f.contact} hint={f.contactHint} error={errors.contact}>
          <input id="sc-contact" className={cls("contact")} value={v.contact} maxLength={120} autoComplete="tel" onChange={(e) => set("contact", e.target.value)} />
        </Field>
        <Field id="sc-deadline" label={`${f.deadline} (${f.optional})`}>
          <input id="sc-deadline" type="date" className={cls("deadline")} value={v.deadline} onChange={(e) => set("deadline", e.target.value)} />
        </Field>
      </div>

      <Field id="sc-message" label={`${f.message} (${f.optional})`}>
        <textarea
          id="sc-message"
          rows={4}
          maxLength={2000}
          className={`${cls("message")} py-3`}
          value={v.message}
          onChange={(e) => set("message", e.target.value)}
        />
      </Field>

      {failure && (
        <p role="alert" className="rounded-xl bg-bad-50 p-3 font-semibold text-bad">
          {failure}
        </p>
      )}

      <button
        type="submit"
        disabled={state === "sending"}
        className="inline-flex min-h-14 w-fit items-center rounded-full bg-brand px-8 text-lg font-extrabold text-white hover:bg-brand-hover disabled:opacity-60"
      >
        {state === "sending" ? s.submitting : s.submit}
      </button>

      <p className="flex items-start gap-2.5 text-sm text-muted">
        <LockIcon className="mt-0.5 size-4 shrink-0" />
        {s.privacyNote}
      </p>
    </form>
  );
}
