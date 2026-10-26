/**
 * E-DV (Electronic Diversity Visa Entry Form, DS-5501) mashq formasi.
 *
 * Maydonlar va tartib manbasi: DV-2026 Federal Register xabarnomasi (89 FR 79997, 2024-10-01),
 * "Completing Your Electronic Entry" bo'limi, 1–14-bandlar.
 * Pasport bo'limi: 22 CFR 42.33(b) yangi tahriri (Final Rule, 2026-03-11, FR Doc. 2026-04737) —
 * DV-2027 dan boshlab pasport raqami, bergan davlat, amal qilish muddati va biografik sahifa skani.
 * [TEKSHIRILSIN] Pasport bo'limining formadagi aniq o'rni va mamlakatlar ro'yxati —
 * DV-2027 rasmiy yo'riqnomasi chiqqach solishtirilsin.
 *
 * Bu ma'lumotlar faqat brauzerda saqlanadi (sessionStorage) — serverga yuborilmaydi.
 */

export type Sex = "" | "male" | "female";

export interface DateParts {
  day: string; // "1".."31"
  month: string; // "1".."12"
  year: string; // "1990"
}

export interface Person {
  lastName: string;
  firstName: string;
  noFirstName: boolean;
  middleName: string;
  noMiddleName: boolean;
  sex: Sex;
  birthDate: DateParts;
  birthCity: string;
  birthCountry: string;
}

export const EDUCATION = [
  "primary",
  "some_high_school",
  "high_school",
  "vocational",
  "some_university",
  "university",
  "some_graduate",
  "masters",
  "some_doctoral",
  "doctorate",
] as const;
export type Education = (typeof EDUCATION)[number];

/** Rasmiy talab: o'rta maktab (high school) yoki unga teng ma'lumot — yoki 2 yillik malakali ish tajribasi */
export const EDUCATION_BELOW_HIGH_SCHOOL: readonly Education[] = ["primary", "some_high_school"];

export const MARITAL = [
  "unmarried",
  "married_not_us",
  "married_us",
  "divorced",
  "widowed",
  "legally_separated",
] as const;
export type Marital = (typeof MARITAL)[number];

/** Turmush o'rtog'i ro'yxatga kiritilishi SHART bo'lgan holat (rasmiy xabarnoma, 13-band) */
export const SPOUSE_REQUIRED: readonly Marital[] = ["married_not_us"];
/** Kiritish ixtiyoriy (jarimasiz) bo'lgan holatlar */
export const SPOUSE_OPTIONAL: readonly Marital[] = ["married_us", "legally_separated"];

export const MAX_CHILDREN = 12;

export interface Mailing {
  inCareOf: string;
  line1: string;
  line2: string;
  city: string;
  district: string;
  postalCode: string;
  country: string;
}

export interface Entrant extends Person {
  /** 6. Country of eligibility: tug'ilgan davlat bo'yichami? */
  eligibilityIsBirthCountry: "" | "yes" | "no";
  eligibilityCountry: string;
  eligibilityBasis: "" | "spouse" | "parent";
  /** Pasport (DV-2027) */
  passportExempt: boolean;
  passportNumber: string;
  passportCountry: string;
  passportExpiry: DateParts;
}

export interface DvForm {
  entrant: Entrant;
  mailing: Mailing;
  residenceCountry: string;
  phone: string;
  email: string;
  education: "" | Education;
  marital: "" | Marital;
  /** ixtiyoriy holatlarda (married_us, legally_separated) — turmush o'rtog'ini kiritadimi */
  includeSpouse: boolean;
  childrenCount: number;
  spouse: Person;
  children: Person[];
}

/** Pasportdan ko'chirilgan "namuna" ma'lumot: anketa shu bilan solishtiriladi */
export interface PassportRef {
  noPassport: boolean;
  surname: string;
  givenNames: string;
  sex: Sex;
  birthDate: DateParts;
  number: string;
  issuingCountry: string;
  expiry: DateParts;
}

export const emptyDate = (): DateParts => ({ day: "", month: "", year: "" });

export const emptyPerson = (): Person => ({
  lastName: "",
  firstName: "",
  noFirstName: false,
  middleName: "",
  noMiddleName: false,
  sex: "",
  birthDate: emptyDate(),
  birthCity: "",
  birthCountry: "",
});

export const emptyForm = (): DvForm => ({
  entrant: {
    ...emptyPerson(),
    eligibilityIsBirthCountry: "",
    eligibilityCountry: "",
    eligibilityBasis: "",
    passportExempt: false,
    passportNumber: "",
    passportCountry: "",
    passportExpiry: emptyDate(),
  },
  mailing: { inCareOf: "", line1: "", line2: "", city: "", district: "", postalCode: "", country: "" },
  residenceCountry: "",
  phone: "",
  email: "",
  education: "",
  marital: "",
  includeSpouse: false,
  childrenCount: 0,
  spouse: emptyPerson(),
  children: [],
});

export const emptyPassport = (): PassportRef => ({
  noPassport: false,
  surname: "",
  givenNames: "",
  sex: "",
  birthDate: emptyDate(),
  number: "",
  issuingCountry: "",
  expiry: emptyDate(),
});

/** Turmush o'rtog'i bo'limi ko'rsatiladimi */
export function hasSpouse(form: Pick<DvForm, "marital" | "includeSpouse">): boolean {
  if (form.marital === "") return false;
  if (SPOUSE_REQUIRED.includes(form.marital)) return true;
  return SPOUSE_OPTIONAL.includes(form.marital) && form.includeSpouse;
}

/** Farzandlar sonini o'zgartirish: mavjud ma'lumot saqlanadi, ortiqchasi kesiladi */
export function resizeChildren(children: Person[], count: number): Person[] {
  const n = Math.max(0, Math.min(MAX_CHILDREN, Math.trunc(count)));
  const next = children.slice(0, n);
  while (next.length < n) next.push(emptyPerson());
  return next;
}

/** "1990-03-07" yoki null (haqiqiy sana bo'lmasa) */
export function toIsoDate(d: DateParts): string | null {
  if (!/^\d{4}$/.test(d.year) || !/^\d{1,2}$/.test(d.month) || !/^\d{1,2}$/.test(d.day)) return null;
  const y = Number(d.year);
  const m = Number(d.month);
  const day = Number(d.day);
  if (m < 1 || m > 12 || day < 1 || y < 1900) return null;
  const date = new Date(Date.UTC(y, m - 1, day));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== day) return null;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export const isDateEmpty = (d: DateParts) => !d.day && !d.month && !d.year;

/** to'liq yillar: birth → on (ISO) */
export function ageOn(birthIso: string, onIso: string): number {
  const [by, bm, bd] = birthIso.split("-").map(Number) as [number, number, number];
  const [y, m, d] = onIso.split("-").map(Number) as [number, number, number];
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

export const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/**
 * Davlatlar (inglizcha, rasmiy formadagi kabi lotincha).
 * [TEKSHIRILSIN] E-DV ochiluvchi ro'yxatidagi aniq nomlar bilan solishtirilsin.
 */
export const COUNTRIES: readonly string[] = (
  "Afghanistan|Albania|Algeria|Andorra|Angola|Antigua and Barbuda|Argentina|Armenia|Australia|Austria|" +
  "Azerbaijan|Bahamas|Bahrain|Bangladesh|Barbados|Belarus|Belgium|Belize|Benin|Bhutan|Bolivia|" +
  "Bosnia and Herzegovina|Botswana|Brazil|Brunei|Bulgaria|Burkina Faso|Burma|Burundi|Cabo Verde|Cambodia|" +
  "Cameroon|Canada|Central African Republic|Chad|Chile|China|Colombia|Comoros|Congo, Democratic Republic of the|" +
  "Congo, Republic of the|Costa Rica|Cote d'Ivoire|Croatia|Cuba|Cyprus|Czechia|Denmark|Djibouti|Dominica|" +
  "Dominican Republic|Ecuador|Egypt|El Salvador|Equatorial Guinea|Eritrea|Estonia|Eswatini|Ethiopia|Fiji|" +
  "Finland|France|Gabon|Gambia|Georgia|Germany|Ghana|Greece|Grenada|Guatemala|Guinea|Guinea-Bissau|Guyana|" +
  "Haiti|Honduras|Hong Kong|Hungary|Iceland|India|Indonesia|Iran|Iraq|Ireland|Israel|Italy|Jamaica|Japan|" +
  "Jordan|Kazakhstan|Kenya|Kiribati|Korea, North|Korea, South|Kosovo|Kuwait|Kyrgyzstan|Laos|Latvia|Lebanon|" +
  "Lesotho|Liberia|Libya|Liechtenstein|Lithuania|Luxembourg|Macau|Madagascar|Malawi|Malaysia|Maldives|Mali|" +
  "Malta|Marshall Islands|Mauritania|Mauritius|Mexico|Micronesia|Moldova|Monaco|Mongolia|Montenegro|Morocco|" +
  "Mozambique|Namibia|Nauru|Nepal|Netherlands|New Zealand|Nicaragua|Niger|Nigeria|North Macedonia|Northern Ireland|" +
  "Norway|Oman|Pakistan|Palau|Panama|Papua New Guinea|Paraguay|Peru|Philippines|Poland|Portugal|Qatar|Romania|" +
  "Russia|Rwanda|Saint Kitts and Nevis|Saint Lucia|Saint Vincent and the Grenadines|Samoa|San Marino|" +
  "Sao Tome and Principe|Saudi Arabia|Senegal|Serbia|Seychelles|Sierra Leone|Singapore|Slovakia|Slovenia|" +
  "Solomon Islands|Somalia|South Africa|South Sudan|Spain|Sri Lanka|Sudan|Suriname|Sweden|Switzerland|Syria|" +
  "Taiwan|Tajikistan|Tanzania|Thailand|Timor-Leste|Togo|Tonga|Trinidad and Tobago|Tunisia|Turkey (Türkiye)|" +
  "Turkmenistan|Tuvalu|Uganda|Ukraine|United Arab Emirates|United Kingdom|United States|Uruguay|Uzbekistan|" +
  "Vanuatu|Vatican City|Venezuela|Vietnam|Yemen|Zambia|Zimbabwe"
).split("|");

export const isCountry = (v: string) => COUNTRIES.includes(v);
