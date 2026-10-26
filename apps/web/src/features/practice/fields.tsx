"use client";

import { createContext, useContext, type ReactNode } from "react";
import { AlertIcon, CrossIcon } from "@/components/icons";
import { format } from "@/i18n/format";
import type { Dictionary } from "@/i18n/dictionaries/types";
import type { Lang } from "@/i18n/locales";
import { bilingual, LABEL_EN, type LabelKey } from "./labels";
import { COUNTRIES, MONTHS_EN, type DateParts } from "./schema";
import { fieldDomId, type Issue } from "./validate";

/** Forma konteksti: til, matnlar, joriy xatolar (faqat "Tekshirish"dan keyin ko'rsatiladi) */
interface FormCtx {
  lang: Lang;
  t: Dictionary;
  issues: readonly Issue[];
  showIssues: boolean;
  readOnly: boolean;
}
const Ctx = createContext<FormCtx | null>(null);

export function FormProvider({ value, children }: { value: FormCtx; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFormCtx(): FormCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("FormProvider yo'q");
  return ctx;
}

export function useLabel() {
  const { lang, t } = useFormCtx();
  return (key: LabelKey) => bilingual(LABEL_EN[key], t.labels[key], lang);
}

export function IssueText({ issue }: { issue: Issue }) {
  const { t } = useFormCtx();
  return <>{format(t.issues[issue.code], issue.params ?? {})}</>;
}

function FieldIssues({ field }: { field: string }) {
  const { issues, showIssues } = useFormCtx();
  if (!showIssues) return null;
  const own = issues.filter((i) => i.field === field);
  if (own.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1">
      {own.map((i) => (
        <li
          key={i.code}
          className={`flex items-start gap-1.5 text-sm font-semibold ${i.severity === "error" ? "text-bad" : "text-warn"}`}
        >
          {i.severity === "error" ? <CrossIcon className="mt-0.5 size-4 shrink-0" /> : <AlertIcon className="mt-0.5 size-4 shrink-0" />}
          <span>
            <IssueText issue={i} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function hasError(issues: readonly Issue[], field: string, show: boolean) {
  return show && issues.some((i) => i.field === field && i.severity === "error");
}

const inputBase =
  "min-h-12 w-full rounded-xl border bg-surface px-3.5 text-base text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none disabled:cursor-not-allowed disabled:bg-paper disabled:text-muted";

/** Maydon qobig'i: yorliq (inglizcha + tarjima), yordam matni, xatolar. data-field — xatoga o'tish uchun. */
export function FieldShell({
  field,
  label,
  help,
  optional,
  htmlFor,
  children,
}: {
  field: string;
  label: string;
  help?: string;
  optional?: boolean;
  htmlFor?: string;
  children: ReactNode;
}) {
  const { t } = useFormCtx();
  const Label = htmlFor ? "label" : "p";
  return (
    <div data-field={field} className="flex flex-col gap-1.5">
      <Label {...(htmlFor ? { htmlFor } : {})} className="font-semibold leading-snug">
        {label}
        {optional && <span className="font-normal text-muted"> · {t.labels.optional}</span>}
      </Label>
      {help && <p className="text-sm leading-relaxed text-muted">{help}</p>}
      {children}
      <FieldIssues field={field} />
    </div>
  );
}

export function TextField({
  field,
  label,
  value,
  onChange,
  help,
  optional,
  disabled,
  autoComplete,
  inputMode,
  type = "text",
  maxLength = 120,
}: {
  field: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  help?: string;
  optional?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "numeric";
  type?: "text" | "email" | "tel";
  maxLength?: number;
}) {
  const { issues, showIssues, readOnly } = useFormCtx();
  const id = fieldDomId(field);
  const bad = hasError(issues, field, showIssues);
  return (
    <FieldShell field={field} label={label} help={help} optional={optional} htmlFor={id}>
      <input
        id={id}
        type={type}
        value={value}
        disabled={disabled || readOnly}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete ?? "off"}
        inputMode={inputMode}
        maxLength={maxLength}
        spellCheck={false}
        aria-invalid={bad || undefined}
        className={`${inputBase} ${bad ? "border-bad" : "border-line-strong"}`}
      />
    </FieldShell>
  );
}

export function SelectField({
  field,
  label,
  value,
  onChange,
  options,
  help,
}: {
  field: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
  help?: string;
}) {
  const { issues, showIssues, readOnly, t } = useFormCtx();
  const id = fieldDomId(field);
  const bad = hasError(issues, field, showIssues);
  return (
    <FieldShell field={field} label={label} help={help} htmlFor={id}>
      <select
        id={id}
        value={value}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={bad || undefined}
        className={`${inputBase} ${bad ? "border-bad" : "border-line-strong"}`}
      >
        <option value="">{t.practice.select}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c, label: c }));

export function CountryField(props: { field: string; label: string; value: string; onChange: (v: string) => void; help?: string }) {
  return <SelectField {...props} options={COUNTRY_OPTIONS} />;
}

export function RadioField<V extends string>({
  field,
  label,
  value,
  onChange,
  options,
  help,
}: {
  field: string;
  label: string;
  value: V | "";
  onChange: (v: V) => void;
  options: readonly { value: V; label: string }[];
  help?: string;
}) {
  const { issues, showIssues, readOnly } = useFormCtx();
  const id = fieldDomId(field);
  const bad = hasError(issues, field, showIssues);
  return (
    <FieldShell field={field} label={label} help={help}>
      <div
        id={id}
        role="radiogroup"
        aria-label={label}
        aria-invalid={bad || undefined}
        tabIndex={-1}
        className={`flex flex-col gap-2 rounded-xl ${bad ? "outline outline-2 outline-offset-4 outline-bad/60" : ""}`}
      >
        {options.map((o) => (
          <label
            key={o.value}
            className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 ${
              value === o.value ? "border-brand bg-brand-50" : "border-line-strong bg-surface hover:border-brand"
            }`}
          >
            <input
              type="radio"
              name={id}
              value={o.value}
              checked={value === o.value}
              disabled={readOnly}
              onChange={() => onChange(o.value)}
              className="size-5 shrink-0 accent-[#1b3b6f]"
            />
            <span className="leading-snug">{o.label}</span>
          </label>
        ))}
      </div>
    </FieldShell>
  );
}

export function CheckboxField({
  field,
  label,
  checked,
  onChange,
  help,
}: {
  field: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  help?: string;
}) {
  const { readOnly } = useFormCtx();
  const id = fieldDomId(field);
  return (
    <div data-field={field} className="flex flex-col gap-1">
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.checked)}
          className="size-5 shrink-0 accent-[#1b3b6f]"
        />
        <span className="font-medium leading-snug">{label}</span>
      </label>
      {help && <p className="pl-8 text-sm leading-relaxed text-muted">{help}</p>}
      <FieldIssues field={field} />
    </div>
  );
}

/** Rasmiy formadagidek: Day / Month / Year */
export function DateField({
  field,
  label,
  value,
  onChange,
  help,
}: {
  field: string;
  label: string;
  value: DateParts;
  onChange: (v: DateParts) => void;
  help?: string;
}) {
  const { issues, showIssues, readOnly, t, lang } = useFormCtx();
  const L = useLabel();
  const id = fieldDomId(field);
  const bad = hasError(issues, field, showIssues);
  const cls = `${inputBase} ${bad ? "border-bad" : "border-line-strong"}`;
  return (
    <FieldShell field={field} label={label} help={help}>
      <div id={id} tabIndex={-1} className="grid grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)_minmax(0,6.5rem)] gap-2">
        <select
          aria-label={L("day")}
          value={value.day}
          disabled={readOnly}
          onChange={(e) => onChange({ ...value, day: e.target.value })}
          className={cls}
        >
          <option value="">{L("day")}</option>
          {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((d) => (
            <option key={d} value={d}>
              {d.padStart(2, "0")}
            </option>
          ))}
        </select>
        <select
          aria-label={L("month")}
          value={value.month}
          disabled={readOnly}
          onChange={(e) => onChange({ ...value, month: e.target.value })}
          className={cls}
        >
          <option value="">{L("month")}</option>
          {MONTHS_EN.map((m, i) => (
            <option key={m} value={String(i + 1)}>
              {bilingual(m, t.months[i], lang)}
            </option>
          ))}
        </select>
        <input
          aria-label={L("year")}
          placeholder={L("year")}
          inputMode="numeric"
          maxLength={4}
          value={value.year}
          disabled={readOnly}
          onChange={(e) => onChange({ ...value, year: e.target.value.replace(/\D/g, "").slice(0, 4) })}
          className={cls}
        />
      </div>
    </FieldShell>
  );
}

/** Bo'lim sarlavhasi (rasmiy formadagi raqamli band) */
export function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-6">
      <div>
        <h3 className="text-lg font-extrabold leading-snug text-brand">{title}</h3>
        {note && <p className="mt-1 text-sm leading-relaxed text-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}
