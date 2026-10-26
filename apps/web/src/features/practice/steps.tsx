"use client";

import { useId, useRef, useState } from "react";
import { CheckIcon, CrossIcon, FileIcon, LockIcon } from "@/components/icons";
import { PhotoCapture } from "@/features/dv-photo/photo-capture";
import type { StoredPhoto } from "@/features/dv-photo/stored-photo";
import { format } from "@/i18n/format";
import {
  CheckboxField,
  CountryField,
  DateField,
  RadioField,
  Section,
  SelectField,
  TextField,
  useFormCtx,
  useLabel,
} from "./fields";
import { bilingual, EDUCATION_EN, LABEL_EN, MARITAL_EN, type LabelKey } from "./labels";
import {
  EDUCATION,
  MARITAL,
  MAX_CHILDREN,
  SPOUSE_OPTIONAL,
  hasSpouse,
  resizeChildren,
  type DvForm,
  type Entrant,
  type PassportRef,
  type Person,
} from "./schema";
import type { ScanInfo } from "./state";
import { fieldDomId } from "./validate";

/** "2. Sex" → "Sex" (oila a'zolari uchun raqamsiz) */
const plain = (s: string) => s.replace(/^\d+\.\s*/, "");

function usePlainLabel() {
  const { lang, t } = useFormCtx();
  return (key: LabelKey) => bilingual(plain(LABEL_EN[key]), plain(t.labels[key]), lang);
}

// ───────────────────────────── 1. Pasport ─────────────────────────────

async function readScan(file: File): Promise<ScanInfo> {
  const head = new Uint8Array(await file.slice(0, 3).arrayBuffer());
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const info = {
      isJpeg,
      width: bitmap.width,
      height: bitmap.height,
      sizeBytes: file.size,
      thumbDataUrl: canvas.toDataURL("image/jpeg", 0.75),
    };
    bitmap.close();
    return info;
  } catch {
    // PDF yoki brauzer o'qiy olmaydigan format
    return { isJpeg, width: 0, height: 0, sizeBytes: file.size, thumbDataUrl: "" };
  }
}

function ScanField({ scan, onChange }: { scan: ScanInfo | null; onChange: (s: ScanInfo | null) => void }) {
  const { t, readOnly, issues, showIssues } = useFormCtx();
  const L = useLabel();
  const p = t.practice.passport;
  const inputId = useId();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const field = "passport.scan";
  const own = showIssues ? issues.filter((i) => i.field === field) : [];

  return (
    <div data-field={field} className="flex flex-col gap-3">
      <p className="font-semibold">{L("passportScan")}</p>
      <p className="text-sm leading-relaxed text-muted">{p.scanLead}</p>
      {scan ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {scan.thumbDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data: URL, faqat qurilmada
            <img src={scan.thumbDataUrl} alt="" className="w-full max-w-xs rounded-xl border border-line" />
          ) : (
            <span className="flex size-24 items-center justify-center rounded-xl border border-line bg-paper text-muted">
              <FileIcon className="size-8" />
            </span>
          )}
          <div className="flex flex-col gap-2 text-sm">
            <p className={`inline-flex items-center gap-1.5 font-bold ${scan.isJpeg ? "text-ok-ink" : "text-bad"}`}>
              {scan.isJpeg ? <CheckIcon className="size-4" /> : <CrossIcon className="size-4" />}
              {scan.isJpeg ? p.scanJpeg : p.scanNotJpeg}
            </p>
            {scan.width > 0 && (
              <p className="text-muted">
                {format(p.scanInfo, { w: scan.width, h: scan.height, kb: Math.round(scan.sizeBytes / 1000) })}
              </p>
            )}
            {!readOnly && (
              <div className="flex gap-2">
                <label
                  htmlFor={inputId}
                  className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line-strong px-4 font-semibold text-brand hover:border-brand"
                >
                  {p.scanReplace}
                </label>
                <button
                  type="button"
                  onClick={() => onChange(null)}
                  className="inline-flex min-h-11 items-center rounded-full px-4 font-semibold text-bad hover:underline"
                >
                  {p.scanRemove}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        !readOnly && (
          <label
            id={fieldDomId(field)}
            tabIndex={-1}
            htmlFor={inputId}
            className={`inline-flex min-h-12 w-fit cursor-pointer items-center gap-2 rounded-full bg-brand px-5 font-bold text-white hover:bg-brand-hover ${
              busy ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <FileIcon />
            {p.scanChoose}
          </label>
        )
      )}
      <input
        ref={ref}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif,application/pdf"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          onChange(await readScan(file));
          setBusy(false);
          if (ref.current) ref.current.value = "";
        }}
      />
      {own.map((i) => (
        <p key={i.code} className={`text-sm font-semibold ${i.severity === "error" ? "text-bad" : "text-warn"}`}>
          {format(t.issues[i.code], i.params ?? {})}
        </p>
      ))}
    </div>
  );
}

export function PassportStep({
  passport,
  scan,
  onPassport,
  onScan,
}: {
  passport: PassportRef;
  scan: ScanInfo | null;
  onPassport: (p: PassportRef) => void;
  onScan: (s: ScanInfo | null) => void;
}) {
  const { t } = useFormCtx();
  const L = useLabel();
  const P = usePlainLabel();
  const p = t.practice.passport;
  const set = <K extends keyof PassportRef>(k: K, v: PassportRef[K]) => onPassport({ ...passport, [k]: v });

  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col gap-1.5 rounded-2xl border border-brand/15 bg-brand-50 p-4 text-sm leading-relaxed text-brand">
        {p.tips.map((tip) => (
          <li key={tip} className="flex gap-2">
            <CheckIcon className="mt-0.5 size-4 shrink-0" />
            {tip}
          </li>
        ))}
      </ul>

      <Section title={L("passport")}>
        <CheckboxField
          field="passport.noPassport"
          label={p.noPassport}
          help={p.noPassportHelp}
          checked={passport.noPassport}
          onChange={(v) => set("noPassport", v)}
        />
        {!passport.noPassport && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                field="passport.surname"
                label={L("surname")}
                value={passport.surname}
                onChange={(v) => set("surname", v)}
              />
              <TextField
                field="passport.givenNames"
                label={L("givenNames")}
                value={passport.givenNames}
                onChange={(v) => set("givenNames", v)}
              />
            </div>
            <RadioField
              field="passport.sex"
              label={P("sex")}
              value={passport.sex}
              onChange={(v) => set("sex", v)}
              options={[
                { value: "male", label: L("male") },
                { value: "female", label: L("female") },
              ]}
            />
            <DateField field="passport.birthDate" label={P("birthDate")} value={passport.birthDate} onChange={(v) => set("birthDate", v)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                field="passport.number"
                label={L("passportNumber")}
                value={passport.number}
                onChange={(v) => set("number", v.toUpperCase())}
                maxLength={20}
              />
              <CountryField
                field="passport.issuingCountry"
                label={L("passportCountry")}
                value={passport.issuingCountry}
                onChange={(v) => set("issuingCountry", v)}
              />
            </div>
            <DateField field="passport.expiry" label={L("passportExpiry")} value={passport.expiry} onChange={(v) => set("expiry", v)} />
          </>
        )}
      </Section>

      {!passport.noPassport && (
        <Section title={p.scanTitle}>
          <ScanField scan={scan} onChange={onScan} />
        </Section>
      )}
    </div>
  );
}

// ───────────────────────────── Shaxs maydonlari ─────────────────────────────

function NameFields({ prefix, person, onChange }: { prefix: string; person: Person; onChange: (p: Person) => void }) {
  const L = useLabel();
  const set = <K extends keyof Person>(k: K, v: Person[K]) => onChange({ ...person, [k]: v });
  return (
    <>
      <TextField
        field={`${prefix}.lastName`}
        label={L("lastName")}
        value={person.lastName}
        onChange={(v) => set("lastName", v)}
        autoComplete={prefix === "entrant" ? "family-name" : "off"}
      />
      <div className="grid gap-2">
        <TextField
          field={`${prefix}.firstName`}
          label={L("firstName")}
          value={person.firstName}
          disabled={person.noFirstName}
          onChange={(v) => set("firstName", v)}
          autoComplete={prefix === "entrant" ? "given-name" : "off"}
        />
        <CheckboxField
          field={`${prefix}.noFirstName`}
          label={L("noFirstName")}
          checked={person.noFirstName}
          onChange={(v) => onChange({ ...person, noFirstName: v, firstName: v ? "" : person.firstName })}
        />
      </div>
      <div className="grid gap-2">
        <TextField
          field={`${prefix}.middleName`}
          label={L("middleName")}
          value={person.middleName}
          disabled={person.noMiddleName}
          onChange={(v) => set("middleName", v)}
        />
        <CheckboxField
          field={`${prefix}.noMiddleName`}
          label={L("noMiddleName")}
          checked={person.noMiddleName}
          onChange={(v) => onChange({ ...person, noMiddleName: v, middleName: v ? "" : person.middleName })}
        />
      </div>
    </>
  );
}

/** Oila a'zosi: ism, jins, tug'ilgan sana/shahar/davlat va foto */
function FamilyMember({
  prefix,
  title,
  person,
  onChange,
  photo,
  onPhoto,
  photoName,
}: {
  prefix: string;
  title: string;
  person: Person;
  onChange: (p: Person) => void;
  photo: StoredPhoto | null;
  onPhoto: (p: StoredPhoto | null) => void;
  photoName: string;
}) {
  const { lang, t, readOnly, issues, showIssues } = useFormCtx();
  const L = useLabel();
  const P = usePlainLabel();
  const set = <K extends keyof Person>(k: K, v: Person[K]) => onChange({ ...person, [k]: v });
  const photoField = `${prefix}.photo`;
  const photoIssues = showIssues ? issues.filter((i) => i.field === photoField) : [];

  return (
    <Section title={title}>
      <NameFields prefix={prefix} person={person} onChange={onChange} />
      <RadioField
        field={`${prefix}.sex`}
        label={P("sex")}
        value={person.sex}
        onChange={(v) => set("sex", v)}
        options={[
          { value: "male", label: L("male") },
          { value: "female", label: L("female") },
        ]}
      />
      <DateField field={`${prefix}.birthDate`} label={P("birthDate")} value={person.birthDate} onChange={(v) => set("birthDate", v)} />
      <TextField field={`${prefix}.birthCity`} label={P("birthCity")} value={person.birthCity} onChange={(v) => set("birthCity", v)} />
      <CountryField
        field={`${prefix}.birthCountry`}
        label={P("birthCountry")}
        value={person.birthCountry}
        onChange={(v) => set("birthCountry", v)}
      />
      <div data-field={photoField} id={fieldDomId(photoField)} tabIndex={-1} className="flex flex-col gap-3 border-t border-line pt-4">
        <p className="font-semibold">{bilingual("Photograph", t.practice.part2.photoTitle, lang)}</p>
        <PhotoCapture value={photo} onChange={onPhoto} lang={lang} t={t} downloadName={photoName} readOnly={readOnly} />
        {photoIssues.map((i) => (
          <p key={i.code} className="text-sm font-semibold text-bad">
            {format(t.issues[i.code], i.params ?? {})}
          </p>
        ))}
      </div>
    </Section>
  );
}

// ───────────────────────────── 3. Anketa, 1-qism ─────────────────────────────

export function Part1Step({
  form,
  onForm,
  entrantPhoto,
  onGoPhoto,
}: {
  form: DvForm;
  onForm: (f: DvForm) => void;
  entrantPhoto: StoredPhoto | null;
  onGoPhoto: () => void;
}) {
  const { t, lang, issues, showIssues, readOnly } = useFormCtx();
  const L = useLabel();
  const P = usePlainLabel();
  const p1 = t.practice.part1;
  const e = form.entrant;
  const setE = <K extends keyof Entrant>(k: K, v: Entrant[K]) => onForm({ ...form, entrant: { ...e, [k]: v } });
  const setM = <K extends keyof DvForm["mailing"]>(k: K, v: string) => onForm({ ...form, mailing: { ...form.mailing, [k]: v } });
  const photoIssues = showIssues ? issues.filter((i) => i.field === "photo.entrant") : [];

  return (
    <div className="flex flex-col gap-5">
      <Section title={L("name")} note={p1.nameHelp}>
        <NameFields prefix="entrant" person={e} onChange={(p) => onForm({ ...form, entrant: { ...e, ...p } })} />
      </Section>

      <Section title={L("sex")}>
        <RadioField
          field="entrant.sex"
          label={P("sex")}
          value={e.sex}
          onChange={(v) => setE("sex", v)}
          options={[
            { value: "male", label: L("male") },
            { value: "female", label: L("female") },
          ]}
        />
      </Section>

      <Section title={L("birthDate")}>
        <DateField field="entrant.birthDate" label={P("birthDate")} value={e.birthDate} onChange={(v) => setE("birthDate", v)} />
      </Section>

      <Section title={L("birthCity")}>
        <TextField field="entrant.birthCity" label={P("birthCity")} value={e.birthCity} onChange={(v) => setE("birthCity", v)} />
      </Section>

      <Section title={L("birthCountry")}>
        <CountryField field="entrant.birthCountry" label={P("birthCountry")} value={e.birthCountry} onChange={(v) => setE("birthCountry", v)} />
      </Section>

      <Section title={L("eligibility")} note={p1.eligibilityHelp}>
        <RadioField
          field="entrant.eligibilityIsBirthCountry"
          label={L("eligibilityQuestion")}
          value={e.eligibilityIsBirthCountry}
          onChange={(v) =>
            onForm({
              ...form,
              entrant: {
                ...e,
                eligibilityIsBirthCountry: v,
                ...(v === "yes" ? { eligibilityCountry: "", eligibilityBasis: "" as const } : {}),
              },
            })
          }
          options={[
            { value: "yes", label: L("yes") },
            { value: "no", label: L("no") },
          ]}
        />
        {e.eligibilityIsBirthCountry === "no" && (
          <>
            <CountryField
              field="entrant.eligibilityCountry"
              label={L("eligibilityCountry")}
              value={e.eligibilityCountry}
              onChange={(v) => setE("eligibilityCountry", v)}
            />
            <RadioField
              field="entrant.eligibilityBasis"
              label={L("eligibilityBasis")}
              value={e.eligibilityBasis}
              onChange={(v) => setE("eligibilityBasis", v)}
              options={[
                { value: "spouse", label: L("basisSpouse") },
                { value: "parent", label: L("basisParent") },
              ]}
            />
          </>
        )}
      </Section>

      <Section title={L("passport")} note={p1.passportNote}>
        <CheckboxField
          field="entrant.passportExempt"
          label={L("passportExempt")}
          checked={e.passportExempt}
          onChange={(v) => setE("passportExempt", v)}
        />
        {!e.passportExempt && (
          <>
            <TextField
              field="entrant.passportNumber"
              label={L("passportNumber")}
              value={e.passportNumber}
              onChange={(v) => setE("passportNumber", v.toUpperCase())}
              maxLength={20}
            />
            <CountryField
              field="entrant.passportCountry"
              label={L("passportCountry")}
              value={e.passportCountry}
              onChange={(v) => setE("passportCountry", v)}
            />
            <DateField
              field="entrant.passportExpiry"
              label={L("passportExpiry")}
              value={e.passportExpiry}
              onChange={(v) => setE("passportExpiry", v)}
            />
          </>
        )}
      </Section>

      <Section title={L("photo")} note={p1.photoUse}>
        <div className="flex items-center gap-4">
          {entrantPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element -- data: URL, faqat qurilmada
            <img src={entrantPhoto.dataUrl} alt="" className="size-24 rounded-xl border border-line object-cover" />
          ) : (
            <span className="flex size-24 items-center justify-center rounded-xl border border-dashed border-line-strong text-center text-xs text-muted">
              {p1.photoMissing}
            </span>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={onGoPhoto}
              className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 font-semibold text-brand hover:border-brand"
            >
              {p1.photoChange}
            </button>
          )}
        </div>
        {photoIssues.map((i) => (
          <p key={i.code} className="text-sm font-semibold text-bad">
            {format(t.issues[i.code], i.params ?? {})}
          </p>
        ))}
      </Section>

      <Section title={L("mailing")} note={p1.mailingHelp}>
        <TextField field="mailing.inCareOf" label={L("inCareOf")} optional value={form.mailing.inCareOf} onChange={(v) => setM("inCareOf", v)} />
        <TextField
          field="mailing.line1"
          label={L("line1")}
          value={form.mailing.line1}
          onChange={(v) => setM("line1", v)}
          autoComplete="address-line1"
        />
        <TextField
          field="mailing.line2"
          label={L("line2")}
          optional
          value={form.mailing.line2}
          onChange={(v) => setM("line2", v)}
          autoComplete="address-line2"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField field="mailing.city" label={L("city")} value={form.mailing.city} onChange={(v) => setM("city", v)} />
          <TextField
            field="mailing.district"
            label={L("district")}
            optional
            value={form.mailing.district}
            onChange={(v) => setM("district", v)}
          />
          <TextField
            field="mailing.postalCode"
            label={L("postalCode")}
            optional
            value={form.mailing.postalCode}
            onChange={(v) => setM("postalCode", v)}
            maxLength={20}
          />
          <CountryField field="mailing.country" label={L("country")} value={form.mailing.country} onChange={(v) => setM("country", v)} />
        </div>
      </Section>

      <Section title={L("residence")}>
        <CountryField
          field="residenceCountry"
          label={P("residence")}
          value={form.residenceCountry}
          onChange={(v) => onForm({ ...form, residenceCountry: v })}
        />
      </Section>

      <Section title={L("phone")}>
        <TextField
          field="phone"
          label={P("phone")}
          optional
          type="tel"
          inputMode="tel"
          value={form.phone}
          onChange={(v) => onForm({ ...form, phone: v })}
          maxLength={24}
        />
      </Section>

      <Section title={L("email")} note={p1.emailHelp}>
        <TextField
          field="email"
          label={P("email")}
          type="email"
          inputMode="email"
          value={form.email}
          onChange={(v) => onForm({ ...form, email: v.trim() })}
          autoComplete="email"
        />
      </Section>

      <Section title={L("education")}>
        <RadioField
          field="education"
          label={P("education")}
          value={form.education}
          onChange={(v) => onForm({ ...form, education: v })}
          options={EDUCATION.map((code) => ({ value: code, label: bilingual(EDUCATION_EN[code], t.education[code], lang) }))}
        />
      </Section>

      <Section title={L("marital")} note={p1.maritalHelp}>
        <RadioField
          field="marital"
          label={P("marital")}
          value={form.marital}
          onChange={(v) => onForm({ ...form, marital: v, includeSpouse: false })}
          options={MARITAL.map((code) => ({ value: code, label: bilingual(MARITAL_EN[code], t.marital[code], lang) }))}
        />
        {form.marital !== "" && SPOUSE_OPTIONAL.includes(form.marital) && (
          <CheckboxField
            field="includeSpouse"
            label={p1.includeSpouse}
            checked={form.includeSpouse}
            onChange={(v) => onForm({ ...form, includeSpouse: v })}
          />
        )}
      </Section>

      <Section title={L("children")} note={p1.childrenHelp}>
        <SelectField
          field="childrenCount"
          label={P("children")}
          value={String(form.childrenCount)}
          onChange={(v) => {
            const n = Number(v || 0);
            onForm({ ...form, childrenCount: n, children: resizeChildren(form.children, n) });
          }}
          options={Array.from({ length: MAX_CHILDREN + 1 }, (_, i) => ({ value: String(i), label: String(i) }))}
        />
      </Section>
    </div>
  );
}

// ───────────────────────────── 4. Anketa, 2-qism ─────────────────────────────

export function Part2Step({
  form,
  onForm,
  photos,
  onPhoto,
}: {
  form: DvForm;
  onForm: (f: DvForm) => void;
  photos: Record<string, StoredPhoto | null>;
  onPhoto: (key: string, p: StoredPhoto | null) => void;
}) {
  const { t, lang } = useFormCtx();
  const p2 = t.practice.part2;
  const spouse = hasSpouse(form);

  if (!spouse && form.children.length === 0) {
    return (
      <p className="flex items-start gap-3 rounded-2xl border border-ok/30 bg-ok-50 p-5 font-semibold text-ok-ink">
        <LockIcon className="mt-0.5 size-5 shrink-0" />
        {p2.none}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {spouse && (
        <FamilyMember
          prefix="spouse"
          title={bilingual(LABEL_EN.spouse, t.labels.spouse, lang)}
          person={form.spouse}
          onChange={(p) => onForm({ ...form, spouse: p })}
          photo={photos.spouse ?? null}
          onPhoto={(p) => onPhoto("spouse", p)}
          photoName="dv-photo-spouse-600x600.jpg"
        />
      )}
      {form.children.map((child, i) => (
        <FamilyMember
          key={i}
          prefix={`children.${i}`}
          title={bilingual(`${LABEL_EN.child} ${i + 1}`, format(p2.childN, { n: i + 1 }), lang)}
          person={child}
          onChange={(p) => onForm({ ...form, children: form.children.map((c, j) => (j === i ? p : c)) })}
          photo={photos[`child-${i}`] ?? null}
          onPhoto={(p) => onPhoto(`child-${i}`, p)}
          photoName={`dv-photo-child-${i + 1}-600x600.jpg`}
        />
      ))}
    </div>
  );
}
