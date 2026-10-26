import type { Lang } from "@/i18n/locales";
import type { Education, Marital } from "./schema";

/**
 * Rasmiy E-DV formasidagi inglizcha nomlar — har doim ko'rsatiladi, tarjima qavsda.
 * Ta'lim va oilaviy holat variantlari: DV-2026 Federal Register xabarnomasi (89 FR 79997) matni.
 * "Gender" → "Sex": 2026-03-11 yakuniy qoidasi bo'yicha (DV-2027 dan).
 */
export const LABEL_EN = {
  name: "1. Name",
  lastName: "Last/Family Name",
  firstName: "First Name",
  middleName: "Middle Name",
  noFirstName: "No First Name",
  noMiddleName: "No Middle Name",
  sex: "2. Sex",
  male: "Male",
  female: "Female",
  birthDate: "3. Birth Date",
  day: "Day",
  month: "Month",
  year: "Year",
  birthCity: "4. City Where You Were Born",
  birthCountry: "5. Country Where You Were Born",
  eligibility: "6. Country of Eligibility for the DV Program",
  eligibilityQuestion: "Are you claiming eligibility based on the country where you were born?",
  eligibilityCountry: "Country of Eligibility",
  eligibilityBasis: "Basis of Eligibility",
  basisSpouse: "Spouse's country of birth",
  basisParent: "Parent's country of birth",
  passport: "Passport",
  passportNumber: "Passport Number",
  passportCountry: "Country or Authority of Passport Issuance",
  passportExpiry: "Passport Expiration Date",
  passportExempt: "I am exempt from the passport requirement",
  photo: "7. Entrant Photograph",
  mailing: "8. Mailing Address",
  inCareOf: "In Care Of",
  line1: "Address Line 1",
  line2: "Address Line 2",
  city: "City/Town",
  district: "District/Country/Province/State",
  postalCode: "Postal Code/Zip Code",
  country: "Country",
  residence: "9. Country Where You Live Today",
  phone: "10. Phone Number",
  email: "11. E-mail Address",
  education: "12. Highest Level of Education You Have Achieved, as of Today",
  marital: "13. Current Marital Status",
  children: "14. Number of Children",
  spouse: "Spouse",
  child: "Child",
  surname: "Surname",
  givenNames: "Given Name(s)",
  passportScan: "Passport Biographic Page Scan",
  yes: "Yes",
  no: "No",
  optional: "optional",
} as const;

export type LabelKey = keyof typeof LABEL_EN;

export const EDUCATION_EN: Record<Education, string> = {
  primary: "Primary school only",
  some_high_school: "Some high school, no diploma",
  high_school: "High school diploma",
  vocational: "Vocational school",
  some_university: "Some university courses",
  university: "University degree",
  some_graduate: "Some graduate-level courses",
  masters: "Master's degree",
  some_doctoral: "Some doctoral-level courses",
  doctorate: "Doctorate",
};

export const MARITAL_EN: Record<Marital, string> = {
  unmarried: "Unmarried",
  married_not_us: "Married and my spouse is NOT a U.S. citizen or U.S. Lawful Permanent Resident (LPR)",
  married_us: "Married and my spouse IS a U.S. citizen or U.S. LPR",
  divorced: "Divorced",
  widowed: "Widowed",
  legally_separated: "Legally Separated",
};

/** "First Name (Ism)"; ingliz tilida — faqat inglizcha */
export function bilingual(en: string, local: string | undefined, lang: Lang): string {
  if (lang === "en" || !local || local === en) return en;
  return `${en} (${local})`;
}
