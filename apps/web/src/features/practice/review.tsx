"use client";

import { AlertIcon, ArrowRightIcon, CheckIcon, CrossIcon } from "@/components/icons";
import { format } from "@/i18n/format";
import type { Dictionary } from "@/i18n/dictionaries/types";
import type { Lang } from "@/i18n/locales";
import { IssueText } from "./fields";
import { bilingual, LABEL_EN, type LabelKey } from "./labels";
import { hasErrors, type Issue } from "./validate";

const plain = (s: string) => s.replace(/^\d+\.\s*/, "");

const FIELD_LABEL: Record<string, LabelKey> = {
  lastName: "lastName",
  firstName: "firstName",
  middleName: "middleName",
  noFirstName: "noFirstName",
  noMiddleName: "noMiddleName",
  sex: "sex",
  birthDate: "birthDate",
  birthCity: "birthCity",
  birthCountry: "birthCountry",
  eligibilityIsBirthCountry: "eligibility",
  eligibilityCountry: "eligibilityCountry",
  eligibilityBasis: "eligibilityBasis",
  passportExempt: "passportExempt",
  passportNumber: "passportNumber",
  passportCountry: "passportCountry",
  passportExpiry: "passportExpiry",
  photo: "photo",
  entrant: "photo",
  inCareOf: "inCareOf",
  line1: "line1",
  line2: "line2",
  city: "city",
  district: "district",
  postalCode: "postalCode",
  country: "country",
  residenceCountry: "residence",
  phone: "phone",
  email: "email",
  education: "education",
  marital: "marital",
  childrenCount: "children",
  surname: "surname",
  givenNames: "givenNames",
  number: "passportNumber",
  issuingCountry: "passportCountry",
  expiry: "passportExpiry",
  scan: "passportScan",
  noPassport: "passportExempt",
};

/** "children.0.birthDate" → "Child 1 (1-farzand) — Birth Date (Tug‘ilgan sana)" */
export function fieldLabel(field: string, t: Dictionary, lang: Lang): string {
  const parts = field.split(".");
  const last = parts[parts.length - 1] ?? field;
  const key = FIELD_LABEL[last];
  const familyPhoto = (parts[0] === "spouse" || parts[0] === "children") && last === "photo";
  const label = familyPhoto
    ? bilingual("Photograph", t.practice.part2.photoTitle, lang)
    : key
      ? bilingual(plain(LABEL_EN[key]), plain(t.labels[key]), lang)
      : last;
  if (parts[0] === "spouse") return `${bilingual(LABEL_EN.spouse, t.labels.spouse, lang)} — ${label}`;
  if (parts[0] === "children") {
    const n = Number(parts[1]) + 1;
    return `${bilingual(`${LABEL_EN.child} ${n}`, format(t.practice.part2.childN, { n }), lang)} — ${label}`;
  }
  if (parts[0] === "passport") return `${t.practice.steps.passport} — ${label}`;
  return label;
}

function IssueList({
  issues,
  t,
  lang,
  onFix,
  severity,
}: {
  issues: readonly Issue[];
  t: Dictionary;
  lang: Lang;
  onFix: (issue: Issue) => void;
  severity: "error" | "warning";
}) {
  const bad = severity === "error";
  return (
    <ul className="flex flex-col gap-2">
      {issues.map((issue, i) => (
        <li key={`${issue.field}-${issue.code}-${i}`}>
          <button
            type="button"
            onClick={() => onFix(issue)}
            className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
              bad ? "border-bad/25 bg-bad-50 hover:border-bad" : "border-warn/25 bg-warn-50 hover:border-warn"
            }`}
          >
            <span
              className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-white ${bad ? "bg-bad" : "bg-warn"}`}
            >
              {bad ? <CrossIcon className="size-4" /> : <AlertIcon className="size-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold uppercase tracking-wide text-muted">
                {t.practice.steps[issue.step]} · {fieldLabel(issue.field, t, lang)}
              </span>
              <span className={`block font-semibold leading-snug ${bad ? "text-bad" : "text-warn"}`}>
                <IssueText issue={issue} />
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 self-center text-sm font-bold text-brand">
              {t.practice.review.fix}
              <ArrowRightIcon className="size-4" />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function ReviewStep({
  issues,
  checked,
  onCheck,
  onFix,
  onSubmit,
  submitting,
  submitError,
  t,
  lang,
}: {
  issues: readonly Issue[];
  checked: boolean;
  onCheck: () => void;
  onFix: (issue: Issue) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: boolean;
  t: Dictionary;
  lang: Lang;
}) {
  const r = t.practice.review;
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  if (!checked) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <p className="leading-relaxed text-ink/80">{r.lead}</p>
        <button
          type="button"
          onClick={onCheck}
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand px-6 font-bold text-white hover:bg-brand-hover"
        >
          <CheckIcon />
          {r.check}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {errors.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-lg font-extrabold text-bad">{format(r.errorsTitle, { n: errors.length })}</h3>
          <IssueList issues={errors} t={t} lang={lang} onFix={onFix} severity="error" />
        </section>
      ) : (
        <p className="flex items-center gap-3 rounded-2xl border border-ok/30 bg-ok-50 p-5 text-lg font-extrabold text-ok-ink">
          <CheckIcon className="size-6" />
          {r.allGood}
        </p>
      )}

      {warnings.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-lg font-extrabold text-warn">{format(r.warningsTitle, { n: warnings.length })}</h3>
          <p className="text-sm text-muted">{r.warningsNote}</p>
          <IssueList issues={warnings} t={t} lang={lang} onFix={onFix} severity="warning" />
        </section>
      )}

      {!hasErrors(issues) && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-brand/20 bg-brand-50 p-5">
          <p className="text-sm leading-relaxed text-brand">{r.submitNote}</p>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-ok px-7 text-lg font-extrabold text-white shadow-sm hover:brightness-95 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                {r.submitting}
              </>
            ) : (
              r.submit
            )}
          </button>
          {submitError && <p className="text-sm font-semibold text-bad">{r.submitFailed}</p>}
        </div>
      )}
    </div>
  );
}
