// PDF namuna (chornovik) — to'liq brauzerda yasaladi, serverga hech narsa yuborilmaydi.
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, degrees, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { photoState } from "@/features/dv-photo/stored-photo";
import { asset } from "@/lib/base-path";
import { format } from "@/i18n/format";
import type { Dictionary } from "@/i18n/dictionaries/types";
import type { Lang } from "@/i18n/locales";
import { bilingual, EDUCATION_EN, LABEL_EN, MARITAL_EN, type LabelKey } from "./labels";
import { hasSpouse, MONTHS_EN, toIsoDate, type DateParts, type Person } from "./schema";
import type { PracticeData } from "./state";

const A4: [number, number] = [595.28, 841.89];
const M = 44; // chet
const BRAND = rgb(27 / 255, 59 / 255, 111 / 255);
const INK = rgb(22 / 255, 35 / 255, 58 / 255);
const MUTED = rgb(91 / 255, 100 / 255, 118 / 255);
const BAD = rgb(180 / 255, 35 / 255, 24 / 255);
const LINE = rgb(228 / 255, 224 / 255, 214 / 255);
const LABEL_W = 220;

const plain = (s: string) => s.replace(/^\d+\.\s*/, "");

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) {
        line = next;
        continue;
      }
      if (line) out.push(line);
      // juda uzun so'z (email, manzil) — belgilab bo'linadi
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > width && rest.length > 1) {
        let cut = rest.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > width) cut--;
        out.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    out.push(line);
  }
  return out;
}

class Writer {
  page!: PDFPage;
  y = 0;
  constructor(
    private readonly doc: PDFDocument,
    private readonly regular: PDFFont,
    private readonly bold: PDFFont,
    private readonly watermark: string,
  ) {
    this.addPage();
  }

  addPage() {
    this.page = this.doc.addPage(A4);
    this.y = A4[1] - M;
    const size = 54;
    const w = this.bold.widthOfTextAtSize(this.watermark, size);
    this.page.drawText(this.watermark, {
      x: A4[0] / 2 - (w / 2) * Math.cos(Math.PI / 5),
      y: A4[1] / 2 - (w / 2) * Math.sin(Math.PI / 5),
      size,
      font: this.bold,
      color: BRAND,
      opacity: 0.06,
      rotate: degrees(36),
    });
  }

  ensure(h: number) {
    if (this.y - h < M + 28) this.addPage();
  }

  text(s: string, o: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; width?: number; x?: number; gap?: number } = {}) {
    const size = o.size ?? 10;
    const font = o.bold ? this.bold : this.regular;
    const lines = wrap(s, font, size, o.width ?? A4[0] - 2 * M);
    const lh = size * 1.35;
    this.ensure(lines.length * lh);
    for (const line of lines) {
      this.page.drawText(line, { x: o.x ?? M, y: this.y - size, size, font, color: o.color ?? INK });
      this.y -= lh;
    }
    this.y -= o.gap ?? 0;
  }

  heading(s: string) {
    // sarlavha sahifa oxirida yolg'iz qolmasin — kamida bir necha qator bilan birga
    this.ensure(110);
    this.y -= 10;
    this.text(s, { size: 13, bold: true, color: BRAND, gap: 2 });
    this.page.drawLine({ start: { x: M, y: this.y }, end: { x: A4[0] - M, y: this.y }, thickness: 1, color: BRAND, opacity: 0.4 });
    this.y -= 8;
  }

  row(label: string, value: string) {
    const size = 9.5;
    const valueW = A4[0] - 2 * M - LABEL_W - 12;
    const ll = wrap(label, this.regular, size - 0.5, LABEL_W);
    const vl = wrap(value || "—", this.bold, size, valueW);
    const lh = size * 1.4;
    const h = Math.max(ll.length, vl.length) * lh + 6;
    this.ensure(h);
    ll.forEach((line, i) =>
      this.page.drawText(line, { x: M, y: this.y - size - i * lh, size: size - 0.5, font: this.regular, color: MUTED }),
    );
    vl.forEach((line, i) =>
      this.page.drawText(line, { x: M + LABEL_W + 12, y: this.y - size - i * lh, size, font: this.bold, color: INK }),
    );
    this.y -= h;
    this.page.drawLine({ start: { x: M, y: this.y + 2 }, end: { x: A4[0] - M, y: this.y + 2 }, thickness: 0.5, color: LINE });
  }

  image(img: PDFImage, size: number, caption: string) {
    this.ensure(size + 24);
    this.page.drawImage(img, { x: M, y: this.y - size, width: size, height: size });
    this.page.drawRectangle({ x: M, y: this.y - size, width: size, height: size, borderColor: LINE, borderWidth: 1 });
    const lines = wrap(caption, this.regular, 8.5, A4[0] - 2 * M - size - 16);
    lines.forEach((line, i) =>
      this.page.drawText(line, { x: M + size + 16, y: this.y - 12 - i * 12, size: 8.5, font: this.regular, color: MUTED }),
    );
    this.y -= size + 12;
  }
}

function dataUrlBytes(dataUrl: string): Uint8Array {
  const bin = atob(dataUrl.split(",", 2)[1] ?? "");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function loadFont(path: string): Promise<ArrayBuffer> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.arrayBuffer();
}

export async function buildPracticePdf(data: PracticeData, lang: Lang, t: Dictionary): Promise<Blob> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle("DV Entry — Practice Draft (vakil)");
  doc.setProducer("vakil");
  doc.setCreator("vakil");
  const [regBytes, boldBytes] = await Promise.all([loadFont(asset("/fonts/NotoSans-Regular.ttf")), loadFont(asset("/fonts/NotoSans-Bold.ttf"))]);
  const regular = await doc.embedFont(regBytes, { subset: true });
  const bold = await doc.embedFont(boldBytes, { subset: true });

  const w = new Writer(doc, regular, bold, "SAMPLE · NAMUNA");
  const L = (key: LabelKey) => bilingual(LABEL_EN[key], t.labels[key], lang);
  const P = (key: LabelKey) => bilingual(plain(LABEL_EN[key]), plain(t.labels[key]), lang);
  const date = (d: DateParts) => {
    const iso = toIsoDate(d);
    if (!iso) return "";
    const [y, m, day] = iso.split("-");
    return `${day} ${MONTHS_EN[Number(m) - 1]} ${y}`;
  };
  const sex = (s: Person["sex"]) => (s === "male" ? LABEL_EN.male : s === "female" ? LABEL_EN.female : "");
  const f = data.form;
  const e = f.entrant;

  // ── Sarlavha ──
  w.text("vakil", { size: 11, bold: true, color: BRAND });
  w.text(t.pdf.title, { size: 20, bold: true, color: INK });
  w.text(t.pdf.subtitle, { size: 11, color: MUTED });
  w.text(format(t.pdf.generated, { date: new Date().toLocaleString(lang === "oz" ? "uz-Cyrl" : lang) }), {
    size: 9,
    color: MUTED,
    gap: 6,
  });
  const banner = wrap(t.pdf.notOfficial, bold, 9, A4[0] - 2 * M - 20);
  const bh = banner.length * 12.5 + 14;
  w.page.drawRectangle({ x: M, y: w.y - bh, width: A4[0] - 2 * M, height: bh, color: rgb(253 / 255, 240 / 255, 238 / 255) });
  banner.forEach((line, i) => w.page.drawText(line, { x: M + 10, y: w.y - 18 - i * 12.5, size: 9, font: bold, color: BAD }));
  w.y -= bh + 6;

  const names = (p: Person) => {
    w.row(L("lastName"), p.lastName.trim());
    w.row(L("firstName"), p.noFirstName ? LABEL_EN.noFirstName : p.firstName.trim());
    w.row(L("middleName"), p.noMiddleName ? LABEL_EN.noMiddleName : p.middleName.trim());
  };
  const embed = async (key: string) => {
    const photo = data.photos[key];
    if (!photo || photoState(photo)?.verdict === "fail") return null;
    return doc.embedJpg(dataUrlBytes(photo.dataUrl));
  };

  // ── 1-qism ──
  w.heading(`Part One — ${t.practice.steps.part1}`);
  w.text(L("name"), { bold: true, size: 10.5, gap: 2 });
  names(e);
  w.row(L("sex"), sex(e.sex));
  w.row(L("birthDate"), date(e.birthDate));
  w.row(L("birthCity"), e.birthCity.trim());
  w.row(L("birthCountry"), e.birthCountry);
  w.row(
    L("eligibility"),
    e.eligibilityIsBirthCountry === "yes"
      ? `${LABEL_EN.yes} — ${e.birthCountry}`
      : `${LABEL_EN.no} — ${e.eligibilityCountry} (${e.eligibilityBasis === "spouse" ? LABEL_EN.basisSpouse : LABEL_EN.basisParent})`,
  );
  if (e.passportExempt) w.row(L("passport"), t.pdf.exempt);
  else {
    w.row(L("passportNumber"), e.passportNumber.trim().toUpperCase());
    w.row(L("passportCountry"), e.passportCountry);
    w.row(L("passportExpiry"), date(e.passportExpiry));
  }
  const entrantImg = await embed("entrant");
  if (entrantImg) {
    w.text(L("photo"), { bold: true, size: 10.5, gap: 4 });
    w.image(entrantImg, 120, t.pdf.photoNote);
  }
  w.text(L("mailing"), { bold: true, size: 10.5, gap: 2 });
  const m = f.mailing;
  if (m.inCareOf.trim()) w.row(L("inCareOf"), m.inCareOf.trim());
  w.row(L("line1"), m.line1.trim());
  if (m.line2.trim()) w.row(L("line2"), m.line2.trim());
  w.row(L("city"), m.city.trim());
  if (m.district.trim()) w.row(L("district"), m.district.trim());
  if (m.postalCode.trim()) w.row(L("postalCode"), m.postalCode.trim());
  w.row(L("country"), m.country);
  w.row(L("residence"), f.residenceCountry);
  w.row(L("phone"), f.phone.trim() || t.pdf.notProvided);
  w.row(L("email"), f.email.trim());
  w.row(L("education"), f.education ? bilingual(EDUCATION_EN[f.education], t.education[f.education], lang) : "");
  w.row(L("marital"), f.marital ? bilingual(MARITAL_EN[f.marital], t.marital[f.marital], lang) : "");
  w.row(L("children"), String(f.children.length));

  // ── 2-qism ──
  const members: { key: string; title: string; person: Person }[] = [];
  if (hasSpouse(f)) members.push({ key: "spouse", title: L("spouse"), person: f.spouse });
  f.children.forEach((c, i) =>
    members.push({
      key: `child-${i}`,
      title: bilingual(`${LABEL_EN.child} ${i + 1}`, format(t.practice.part2.childN, { n: i + 1 }), lang),
      person: c,
    }),
  );
  if (members.length > 0) {
    w.heading(`Part Two — ${t.practice.steps.part2}`);
    for (const member of members) {
      w.text(member.title, { bold: true, size: 11, color: BRAND, gap: 2 });
      names(member.person);
      w.row(P("sex"), sex(member.person.sex));
      w.row(P("birthDate"), date(member.person.birthDate));
      w.row(P("birthCity"), member.person.birthCity.trim());
      w.row(P("birthCountry"), member.person.birthCountry);
      const img = await embed(member.key);
      if (img) w.image(img, 90, t.pdf.photoNote);
      w.y -= 6;
    }
  }

  // ── Pasportdan (solishtirish uchun) ──
  if (!data.passport.noPassport) {
    w.heading(t.pdf.passportRef);
    w.row(L("surname"), data.passport.surname.trim());
    w.row(L("givenNames"), data.passport.givenNames.trim() || t.pdf.notProvided);
    w.row(L("passportNumber"), data.passport.number.trim().toUpperCase());
    w.row(L("passportExpiry"), date(data.passport.expiry));
  }

  // ── Har sahifa pastida: raqam va ogohlantirish ──
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    const footer = `vakil · Not an official form · dvprogram.state.gov`;
    page.drawText(footer, { x: M, y: 24, size: 8, font: regular, color: MUTED });
    const num = format(t.pdf.page, { n: i + 1, total: pages.length });
    page.drawText(num, { x: A4[0] - M - regular.widthOfTextAtSize(num, 8), y: 24, size: 8, font: regular, color: MUTED });
  });

  const bytes = await doc.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}
