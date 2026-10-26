import { describe, expect, it } from "vitest";
import { emptyForm, emptyPassport, resizeChildren, toIsoDate, type DvForm, type PassportRef } from "./schema";
import { formGivenNames, hasErrors, normalizeName, validatePractice, type ValidationInput } from "./validate";

const TODAY = "2026-10-26";

function validInput(): ValidationInput {
  const passport: PassportRef = {
    ...emptyPassport(),
    surname: "KARIMOV",
    givenNames: "ALISHER",
    sex: "male",
    birthDate: { day: "7", month: "3", year: "1994" },
    number: "FA1234567",
    issuingCountry: "Uzbekistan",
    expiry: { day: "1", month: "6", year: "2031" },
  };
  const form: DvForm = emptyForm();
  form.entrant = {
    ...form.entrant,
    lastName: "Karimov",
    firstName: "Alisher",
    noMiddleName: true,
    sex: "male",
    birthDate: { day: "7", month: "3", year: "1994" },
    birthCity: "Tashkent",
    birthCountry: "Uzbekistan",
    eligibilityIsBirthCountry: "yes",
    passportNumber: "fa 1234567",
    passportCountry: "Uzbekistan",
    passportExpiry: { day: "1", month: "6", year: "2031" },
  };
  form.mailing = { ...form.mailing, line1: "12 Amir Temur street, apt 5", city: "Tashkent", country: "Uzbekistan" };
  form.residenceCountry = "Uzbekistan";
  form.email = "alisher@example.com";
  form.education = "university";
  form.marital = "unmarried";
  return {
    passport,
    scan: { isJpeg: true, width: 1600, height: 1100 },
    form,
    photos: { entrant: { verdict: "review", selfChecksDone: true } },
    today: TODAY,
  };
}

const codes = (input: ValidationInput) => validatePractice(input).map((i) => `${i.field}:${i.code}`);

describe("validatePractice — to'g'ri anketa", () => {
  it("xato ham, ogohlantirish ham yo'q", () => {
    expect(validatePractice(validInput())).toEqual([]);
  });

  it("pasport raqami bo'shliq va kichik harf bilan yozilsa ham mos keladi", () => {
    const input = validInput();
    input.form.entrant.passportNumber = "Fa 123 4567";
    expect(hasErrors(validatePractice(input))).toBe(false);
  });

  it("ism apostrof turlari farq qilsa ham mos (O‘G‘LI = O'G'LI)", () => {
    const input = validInput();
    input.passport.givenNames = "ALISHER ULUG'BEK O'G'LI";
    input.form.entrant.noMiddleName = false;
    input.form.entrant.middleName = "Ulug‘bek o‘g‘li";
    expect(validatePractice(input)).toEqual([]);
  });

  it("faqat bitta ism: familiya maydonida, No First Name belgilangan", () => {
    const input = validInput();
    input.passport.givenNames = "";
    input.form.entrant.firstName = "";
    input.form.entrant.noFirstName = true;
    expect(validatePractice(input)).toEqual([]);
  });
});

describe("validatePractice — xatoga olib borish", () => {
  it("ism pasportdagidan farq qiladi → entrant.firstName, pasportdagi qiymat ko'rsatiladi", () => {
    const input = validInput();
    input.form.entrant.firstName = "Alisher Ulugbek";
    const issue = validatePractice(input).find((i) => i.code === "name_mismatch");
    expect(issue).toMatchObject({ step: "part1", field: "entrant.firstName", severity: "error" });
    expect(issue?.params).toEqual({ passport: "ALISHER", entered: "ALISHER ULUGBEK" });
  });

  it("familiya farq qiladi → entrant.lastName", () => {
    const input = validInput();
    input.form.entrant.lastName = "Karimova";
    expect(codes(input)).toContain("entrant.lastName:name_mismatch");
  });

  it("kirill harflari → latin_only", () => {
    const input = validInput();
    input.form.entrant.lastName = "Каримов";
    expect(codes(input)).toContain("entrant.lastName:latin_only");
  });

  it("turkcha diakritika → faqat ogohlantirish", () => {
    const input = validInput();
    input.passport.surname = "ŞAHİN";
    input.form.entrant.lastName = "Şahin";
    const issues = validatePractice(input);
    const diacritics = issues.filter((i) => i.code === "latin_diacritics");
    expect(diacritics.length).toBeGreaterThan(0);
    expect(diacritics.every((i) => i.severity === "warning")).toBe(true);
    expect(hasErrors(issues)).toBe(false);
    // diakritikasiz yozilgani ham pasportga mos hisoblanadi
    input.form.entrant.lastName = "Sahin";
    expect(codes(input)).not.toContain("entrant.lastName:name_mismatch");
  });

  it("raqam va belgilar ismda → invalid_chars", () => {
    const input = validInput();
    input.form.entrant.lastName = "Karimov2";
    expect(codes(input)).toContain("entrant.lastName:invalid_chars");
  });

  it("jins va tug'ilgan sana pasportga mos emas", () => {
    const input = validInput();
    input.form.entrant.sex = "female";
    input.form.entrant.birthDate = { day: "3", month: "7", year: "1994" };
    expect(codes(input)).toEqual(expect.arrayContaining(["entrant.sex:sex_mismatch", "entrant.birthDate:dob_mismatch"]));
  });

  it("31-fevral → date_invalid; kelajakdagi sana → date_future", () => {
    const input = validInput();
    input.form.entrant.birthDate = { day: "31", month: "2", year: "1994" };
    expect(codes(input)).toContain("entrant.birthDate:date_invalid");
    input.form.entrant.birthDate = { day: "1", month: "1", year: "2030" };
    expect(codes(input)).toContain("entrant.birthDate:date_future");
  });

  it("pasport muddati o'tgan → passport_expired (ikkala joyda)", () => {
    const input = validInput();
    input.passport.expiry = { day: "1", month: "1", year: "2026" };
    input.form.entrant.passportExpiry = { day: "1", month: "1", year: "2026" };
    expect(codes(input)).toEqual(
      expect.arrayContaining(["passport.expiry:passport_expired", "entrant.passportExpiry:passport_expired"]),
    );
  });

  it("pasport raqami/davlati/muddati namunadan farq qiladi", () => {
    const input = validInput();
    input.form.entrant.passportNumber = "FA7654321";
    input.form.entrant.passportCountry = "Kazakhstan";
    input.form.entrant.passportExpiry = { day: "2", month: "6", year: "2031" };
    expect(codes(input)).toEqual(
      expect.arrayContaining([
        "entrant.passportNumber:passport_number_mismatch",
        "entrant.passportCountry:passport_country_mismatch",
        "entrant.passportExpiry:passport_expiry_mismatch",
      ]),
    );
  });

  it("pasport skani yo'q / JPEG emas / tik (portret)", () => {
    const a = validInput();
    a.scan = null;
    expect(codes(a)).toContain("passport.scan:scan_missing");
    const b = validInput();
    b.scan = { isJpeg: false, width: 900, height: 1200 };
    const issues = validatePractice(b).filter((i) => i.field === "passport.scan");
    expect(issues.map((i) => [i.code, i.severity])).toEqual([
      ["scan_not_jpeg", "error"],
      ["scan_portrait", "warning"],
    ]);
  });

  it("pasportsiz (istisno): namuna va anketada bir xil belgilanishi kerak", () => {
    const input = validInput();
    input.passport.noPassport = true;
    expect(codes(input)).toContain("entrant.passportExempt:exempt_mismatch");
    input.form.entrant.passportExempt = true;
    const issues = validatePractice(input);
    expect(hasErrors(issues)).toBe(false);
    expect(issues.map((i) => i.code)).toEqual(["exempt_note"]);
  });

  it("foto: yo'q / talabga javob bermaydi / tasdiqlanmagan", () => {
    const input = validInput();
    input.photos = {};
    expect(codes(input)).toContain("photo.entrant:photo_missing");
    input.photos = { entrant: { verdict: "fail", selfChecksDone: true } };
    expect(codes(input)).toContain("photo.entrant:photo_failed");
    input.photos = { entrant: { verdict: "pass", selfChecksDone: false } };
    expect(codes(input)).toContain("photo.entrant:photo_confirm");
  });

  it("email va telefon formati", () => {
    const input = validInput();
    input.form.email = "alisher@example";
    input.form.phone = "12-ab";
    expect(codes(input)).toEqual(expect.arrayContaining(["email:email_invalid", "phone:phone_invalid"]));
    input.form.phone = "+998 90 123 45 67";
    expect(codes(input)).not.toContain("phone:phone_invalid");
  });

  it("ta'lim o'rta maktabdan past → ogohlantirish (ish tajribasi muqobili)", () => {
    const input = validInput();
    input.form.education = "some_high_school";
    const issue = validatePractice(input).find((i) => i.code === "education_requirement");
    expect(issue?.severity).toBe("warning");
  });

  it("majburiy maydonlar bo'sh → required", () => {
    const input = validInput();
    input.form.mailing.line1 = "";
    input.form.residenceCountry = "";
    input.form.marital = "";
    expect(codes(input)).toEqual(
      expect.arrayContaining(["mailing.line1:required", "residenceCountry:required", "marital:required"]),
    );
  });

  it("ro'yxatda yo'q davlat → required", () => {
    const input = validInput();
    input.form.entrant.birthCountry = "Atlantis";
    expect(codes(input)).toContain("entrant.birthCountry:required");
  });
});

describe("validatePractice — oila", () => {
  it("turmush qurgan (o'rtog'i AQSh fuqarosi emas) → turmush o'rtog'i majburiy, 2-qismga olib boradi", () => {
    const input = validInput();
    input.form.marital = "married_not_us";
    const spouseIssues = validatePractice(input).filter((i) => i.field.startsWith("spouse."));
    expect(spouseIssues.every((i) => i.step === "part2")).toBe(true);
    expect(spouseIssues.map((i) => i.field)).toEqual(
      expect.arrayContaining(["spouse.lastName", "spouse.birthDate", "spouse.photo"]),
    );
  });

  it("o'rtog'i AQSh fuqarosi → kiritish ixtiyoriy", () => {
    const input = validInput();
    input.form.marital = "married_us";
    expect(validatePractice(input)).toEqual([]);
  });

  it("21 yoshdan katta farzand → xato", () => {
    const input = validInput();
    input.form.childrenCount = 1;
    input.form.children = resizeChildren([], 1);
    input.form.children[0] = {
      ...input.form.children[0]!,
      lastName: "Karimov",
      firstName: "Aziz",
      noMiddleName: true,
      sex: "male",
      birthDate: { day: "1", month: "1", year: "2005" },
      birthCity: "Tashkent",
      birthCountry: "Uzbekistan",
    };
    input.photos["child-0"] = { verdict: "pass", selfChecksDone: true };
    expect(codes(input)).toEqual(["children.0.birthDate:child_over_21"]);
  });

  it("muvofiqlik turmush o'rtog'i orqali — o'rtog'ining tug'ilgan davlati bilan mos bo'lishi kerak", () => {
    const input = validInput();
    input.form.entrant.eligibilityIsBirthCountry = "no";
    input.form.entrant.eligibilityCountry = "Kazakhstan";
    input.form.entrant.eligibilityBasis = "spouse";
    expect(codes(input)).toContain("entrant.eligibilityBasis:eligibility_spouse");
  });

  it("muvofiqlik davlati tug'ilgan davlat bilan bir xil → 'Ha' deb javob berish kerak", () => {
    const input = validInput();
    input.form.entrant.eligibilityIsBirthCountry = "no";
    input.form.entrant.eligibilityCountry = "Uzbekistan";
    input.form.entrant.eligibilityBasis = "parent";
    expect(codes(input)).toContain("entrant.eligibilityCountry:eligibility_same");
  });
});

describe("yordamchilar", () => {
  it("toIsoDate", () => {
    expect(toIsoDate({ day: "7", month: "3", year: "1994" })).toBe("1994-03-07");
    expect(toIsoDate({ day: "29", month: "2", year: "2023" })).toBeNull();
    expect(toIsoDate({ day: "29", month: "2", year: "2024" })).toBe("2024-02-29");
    expect(toIsoDate({ day: "", month: "3", year: "1994" })).toBeNull();
  });

  it("normalizeName va formGivenNames", () => {
    expect(normalizeName("  o‘g‘li   ULUG`bek ")).toBe("O'G'LI ULUG'BEK");
    const p = { ...emptyForm().entrant, firstName: "Anna", middleName: "Maria" };
    expect(formGivenNames(p)).toBe("ANNA MARIA");
    expect(formGivenNames({ ...p, noMiddleName: true })).toBe("ANNA");
  });

  it("resizeChildren ma'lumotni saqlaydi", () => {
    const one = resizeChildren([], 1);
    one[0]!.firstName = "Aziz";
    const three = resizeChildren(one, 3);
    expect(three).toHaveLength(3);
    expect(three[0]!.firstName).toBe("Aziz");
    expect(resizeChildren(three, 0)).toEqual([]);
    expect(resizeChildren(three, 99)).toHaveLength(12);
  });
});
