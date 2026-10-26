import {
  EDUCATION_BELOW_HIGH_SCHOOL,
  ageOn,
  hasSpouse,
  isCountry,
  isDateEmpty,
  toIsoDate,
  type DateParts,
  type DvForm,
  type PassportRef,
  type Person,
} from "./schema";

/** Mashq qadamlari (anketa tartibida) */
export const STEPS = ["passport", "photo", "part1", "part2", "review"] as const;
export type StepId = (typeof STEPS)[number];

export type Severity = "error" | "warning";

export type IssueCode =
  | "required"
  | "latin_only"
  | "latin_diacritics"
  | "invalid_chars"
  | "date_invalid"
  | "date_future"
  | "name_mismatch"
  | "sex_mismatch"
  | "dob_mismatch"
  | "passport_number_format"
  | "passport_number_mismatch"
  | "passport_country_mismatch"
  | "passport_expiry_mismatch"
  | "passport_expired"
  | "exempt_mismatch"
  | "exempt_note"
  | "scan_missing"
  | "scan_not_jpeg"
  | "scan_portrait"
  | "photo_missing"
  | "photo_failed"
  | "photo_confirm"
  | "eligibility_same"
  | "eligibility_spouse"
  | "eligibility_parent"
  | "email_invalid"
  | "phone_invalid"
  | "education_requirement"
  | "child_over_21"
  | "child_dob_before_parent";

export interface Issue {
  step: StepId;
  /** maydon yo'li — DOM id shundan yasaladi: fieldDomId(field) */
  field: string;
  code: IssueCode;
  severity: Severity;
  params?: Record<string, string | number>;
}

export interface PhotoState {
  verdict: "pass" | "review" | "fail";
  selfChecksDone: boolean;
}

export interface ScanState {
  isJpeg: boolean;
  width: number;
  height: number;
}

export interface ValidationInput {
  passport: PassportRef;
  scan: ScanState | null;
  form: DvForm;
  /** kalitlar: "entrant", "spouse", "child-0", "child-1", ... */
  photos: Partial<Record<string, PhotoState>>;
  /** bugungi sana, ISO "YYYY-MM-DD" */
  today: string;
}

export const fieldDomId = (field: string) => `f-${field.replace(/\./g, "-")}`;

// ───────────────────────────── Matn qoidalari ─────────────────────────────

const CYRILLIC = /\p{Script=Cyrillic}/u;
const NON_ASCII_LETTER = /[^\x00-\x7F]/;
const NAME_ALLOWED = /^[A-Za-z\s'\-.‘’ʼʻ`]*$/;
const ADDRESS_ALLOWED = /^[A-Za-z0-9\s'\-.,#/()&:;‘’ʼʻ`]*$/;

/** Ism solishtirish uchun: katta harf, apostrof turlari bitta, bo'shliqlar bitta */
export function normalizeName(s: string): string {
  return s
    .normalize("NFC")
    .toUpperCase()
    .replace(/[‘’ʼʻ`´]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Solishtirish kaliti: diakritikasiz (Ş→S, İ→I, ö→O). Diakritika alohida ogohlantiriladi
 * (latin_diacritics), shuning uchun "ŞAHİN" va "SAHIN" bir ism hisoblanadi.
 */
export function nameKey(s: string): string {
  return normalizeName(s.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/ı/g, "i"));
}

export function normalizePassportNumber(s: string): string {
  return s.toUpperCase().replace(/\s+/g, "");
}

function textIssue(value: string, kind: "name" | "address"): IssueCode | null {
  if (!value) return null;
  if (CYRILLIC.test(value)) return "latin_only";
  const allowed = kind === "name" ? NAME_ALLOWED : ADDRESS_ALLOWED;
  if (allowed.test(value)) return null;
  // Lotin harfi, lekin diakritik (ö, ş, ğ ...) — rasmiy forma qabul qilmasligi mumkin
  const stripped = value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  if (allowed.test(stripped.replace(/ı/g, "i")) && NON_ASCII_LETTER.test(value)) return "latin_diacritics";
  return "invalid_chars";
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ───────────────────────────── Yig'uvchi ─────────────────────────────

class Collector {
  readonly list: Issue[] = [];
  constructor(private readonly step: StepId) {}

  add(field: string, code: IssueCode, params?: Issue["params"], severity?: Severity) {
    const sev: Severity =
      severity ?? (code === "latin_diacritics" || code === "scan_portrait" || code === "education_requirement" ||
        code === "eligibility_parent" || code === "exempt_note"
        ? "warning"
        : "error");
    this.list.push({ step: this.step, field, code, severity: sev, ...(params ? { params } : {}) });
  }

  required(field: string, value: string | boolean | number | null | undefined): boolean {
    const empty = value === "" || value === null || value === undefined || value === false;
    if (empty) this.add(field, "required");
    return !empty;
  }

  text(field: string, value: string, kind: "name" | "address", required: boolean) {
    const v = value.trim();
    if (required && !this.required(field, v)) return;
    const code = textIssue(v, kind);
    if (code) this.add(field, code);
  }

  country(field: string, value: string) {
    if (this.required(field, value) && !isCountry(value)) this.add(field, "required");
  }

  /** sana: majburiy, haqiqiy, kelajakda emas (pastFalse=false bo'lsa kelajak ruxsat) */
  date(field: string, d: DateParts, today: string, opts: { notFuture: boolean }): string | null {
    if (isDateEmpty(d)) {
      this.add(field, "required");
      return null;
    }
    const iso = toIsoDate(d);
    if (!iso) {
      this.add(field, "date_invalid");
      return null;
    }
    if (opts.notFuture && iso > today) {
      this.add(field, "date_future");
      return null;
    }
    return iso;
  }
}

/** Ism maydonlari: Last — har doim; First/Middle — "No ..." belgilanmagan bo'lsa */
function personNames(c: Collector, p: Person, prefix: string) {
  c.text(`${prefix}.lastName`, p.lastName, "name", true);
  if (!p.noFirstName) c.text(`${prefix}.firstName`, p.firstName, "name", true);
  if (!p.noMiddleName) c.text(`${prefix}.middleName`, p.middleName, "name", true);
}

function personRest(c: Collector, p: Person, prefix: string, today: string): string | null {
  c.required(`${prefix}.sex`, p.sex);
  const dob = c.date(`${prefix}.birthDate`, p.birthDate, today, { notFuture: true });
  c.text(`${prefix}.birthCity`, p.birthCity, "address", true);
  c.country(`${prefix}.birthCountry`, p.birthCountry);
  return dob;
}

function photoIssues(c: Collector, field: string, photo: PhotoState | undefined) {
  if (!photo) c.add(field, "photo_missing");
  else if (photo.verdict === "fail") c.add(field, "photo_failed");
  else if (!photo.selfChecksDone) c.add(field, "photo_confirm");
}

/** Anketadagi ism (First + Middle) — pasportdagi "Given names" bilan solishtirish uchun */
export function formGivenNames(p: Person): string {
  return normalizeName([p.noFirstName ? "" : p.firstName, p.noMiddleName ? "" : p.middleName].join(" "));
}

// ───────────────────────────── Asosiy funksiya ─────────────────────────────

export function validatePractice(input: ValidationInput): Issue[] {
  const { passport: ref, scan, form, photos, today } = input;
  const e = form.entrant;

  // ── 1. Pasport (namuna) ──
  const cp = new Collector("passport");
  let refDob: string | null = null;
  let refExpiry: string | null = null;
  if (ref.noPassport) {
    cp.add("passport.noPassport", "exempt_note");
  } else {
    cp.text("passport.surname", ref.surname, "name", true);
    cp.text("passport.givenNames", ref.givenNames, "name", false);
    cp.required("passport.sex", ref.sex);
    refDob = cp.date("passport.birthDate", ref.birthDate, today, { notFuture: true });
    if (cp.required("passport.number", ref.number.trim()) && !/^[A-Z0-9]{5,20}$/.test(normalizePassportNumber(ref.number))) {
      cp.add("passport.number", "passport_number_format");
    }
    cp.country("passport.issuingCountry", ref.issuingCountry);
    refExpiry = cp.date("passport.expiry", ref.expiry, today, { notFuture: false });
    if (refExpiry && refExpiry < today) cp.add("passport.expiry", "passport_expired");

    if (!scan) cp.add("passport.scan", "scan_missing");
    else {
      if (!scan.isJpeg) cp.add("passport.scan", "scan_not_jpeg");
      if (scan.height > scan.width) cp.add("passport.scan", "scan_portrait");
    }
  }

  // ── 2. Foto ──
  const cf = new Collector("photo");
  photoIssues(cf, "photo.entrant", photos.entrant);

  // ── 3. Anketa, 1-qism ──
  const c1 = new Collector("part1");
  const refUsable = !ref.noPassport && ref.surname.trim() !== "";

  // 1. Name
  personNames(c1, e, "entrant");
  if (refUsable) {
    const last = normalizeName(e.lastName);
    if (last && nameKey(last) !== nameKey(ref.surname)) {
      c1.add("entrant.lastName", "name_mismatch", { passport: normalizeName(ref.surname), entered: last });
    }
    const given = formGivenNames(e);
    const refGiven = normalizeName(ref.givenNames);
    const firstFilled = e.noFirstName || e.firstName.trim() !== "";
    const middleFilled = e.noMiddleName || e.middleName.trim() !== "";
    if (firstFilled && middleFilled && nameKey(given) !== nameKey(refGiven)) {
      c1.add("entrant.firstName", "name_mismatch", { passport: refGiven || "—", entered: given || "—" });
    }
  }
  // 2–5
  const dob = personRest(c1, e, "entrant", today);
  if (refUsable && e.sex && ref.sex && e.sex !== ref.sex) c1.add("entrant.sex", "sex_mismatch");
  if (dob && refDob && dob !== refDob) c1.add("entrant.birthDate", "dob_mismatch", { passport: refDob, entered: dob });

  // 6. Country of eligibility
  if (c1.required("entrant.eligibilityIsBirthCountry", e.eligibilityIsBirthCountry) && e.eligibilityIsBirthCountry === "no") {
    c1.country("entrant.eligibilityCountry", e.eligibilityCountry);
    c1.required("entrant.eligibilityBasis", e.eligibilityBasis);
    if (e.eligibilityCountry && e.eligibilityCountry === e.birthCountry) {
      c1.add("entrant.eligibilityCountry", "eligibility_same");
    } else if (e.eligibilityBasis === "spouse") {
      if (!hasSpouse(form) || form.spouse.birthCountry !== e.eligibilityCountry) {
        c1.add("entrant.eligibilityBasis", "eligibility_spouse");
      }
    } else if (e.eligibilityBasis === "parent") {
      c1.add("entrant.eligibilityBasis", "eligibility_parent");
    }
  }

  // Pasport (DV-2027)
  if (e.passportExempt !== ref.noPassport) c1.add("entrant.passportExempt", "exempt_mismatch");
  if (!e.passportExempt) {
    if (c1.required("entrant.passportNumber", e.passportNumber.trim())) {
      const num = normalizePassportNumber(e.passportNumber);
      if (!/^[A-Z0-9]{5,20}$/.test(num)) c1.add("entrant.passportNumber", "passport_number_format");
      else if (!ref.noPassport && ref.number.trim() && num !== normalizePassportNumber(ref.number)) {
        c1.add("entrant.passportNumber", "passport_number_mismatch", {
          passport: normalizePassportNumber(ref.number),
          entered: num,
        });
      }
    }
    c1.country("entrant.passportCountry", e.passportCountry);
    if (e.passportCountry && !ref.noPassport && ref.issuingCountry && e.passportCountry !== ref.issuingCountry) {
      c1.add("entrant.passportCountry", "passport_country_mismatch", { passport: ref.issuingCountry });
    }
    const exp = c1.date("entrant.passportExpiry", e.passportExpiry, today, { notFuture: false });
    if (exp && exp < today) c1.add("entrant.passportExpiry", "passport_expired");
    else if (exp && refExpiry && exp !== refExpiry) {
      c1.add("entrant.passportExpiry", "passport_expiry_mismatch", { passport: refExpiry, entered: exp });
    }
  }

  // 8. Mailing address
  const m = form.mailing;
  c1.text("mailing.inCareOf", m.inCareOf, "name", false);
  c1.text("mailing.line1", m.line1, "address", true);
  c1.text("mailing.line2", m.line2, "address", false);
  c1.text("mailing.city", m.city, "address", true);
  c1.text("mailing.district", m.district, "address", false);
  c1.text("mailing.postalCode", m.postalCode, "address", false);
  c1.country("mailing.country", m.country);
  // 9–11
  c1.country("residenceCountry", form.residenceCountry);
  const phone = form.phone.trim();
  if (phone) {
    const digits = phone.replace(/\D/g, "").length;
    if (!/^\+?[\d\s\-()]+$/.test(phone) || digits < 7 || digits > 15) c1.add("phone", "phone_invalid");
  }
  if (c1.required("email", form.email.trim()) && !EMAIL.test(form.email.trim())) c1.add("email", "email_invalid");
  // 12–14
  if (c1.required("education", form.education) && EDUCATION_BELOW_HIGH_SCHOOL.includes(form.education as never)) {
    c1.add("education", "education_requirement");
  }
  c1.required("marital", form.marital);

  // ── 4. Anketa, 2-qism: turmush o'rtog'i va farzandlar ──
  const c2 = new Collector("part2");
  if (hasSpouse(form)) {
    personNames(c2, form.spouse, "spouse");
    personRest(c2, form.spouse, "spouse", today);
    photoIssues(c2, "spouse.photo", photos.spouse);
  }
  form.children.forEach((child, i) => {
    const prefix = `children.${i}`;
    personNames(c2, child, prefix);
    const childDob = personRest(c2, child, prefix, today);
    if (childDob) {
      if (ageOn(childDob, today) >= 21) c2.add(`${prefix}.birthDate`, "child_over_21", { n: i + 1 });
      else if (dob && childDob <= dob) c2.add(`${prefix}.birthDate`, "child_dob_before_parent", { n: i + 1 });
    }
    photoIssues(c2, `${prefix}.photo`, photos[`child-${i}`]);
  });

  return [...cp.list, ...cf.list, ...c1.list, ...c2.list];
}

export const hasErrors = (issues: readonly Issue[]) => issues.some((i) => i.severity === "error");

export function countByStep(issues: readonly Issue[]): Record<StepId, { errors: number; warnings: number }> {
  const out = Object.fromEntries(STEPS.map((s) => [s, { errors: 0, warnings: 0 }])) as Record<
    StepId,
    { errors: number; warnings: number }
  >;
  for (const i of issues) out[i.step][i.severity === "error" ? "errors" : "warnings"]++;
  return out;
}
