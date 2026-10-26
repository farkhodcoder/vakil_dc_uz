> **ESKIRGAN (2026-10-26):** mahsulot faqat DV mashq saytiga o‘zgardi — amaldagi hujjat: [07-dv-mashq.md](07-dv-mashq.md).

# vakil — arxitektura (1-qadam, tasdiq uchun)

> Holat: **TASDIQLANGAN** (2026-10-25), keyin backend Supabase'ga o'zgartirildi
> Qoida: hech bir qonun, narx, muddat yoki talab o'ylab topilmaydi. Ishonch to'liq bo'lmagan joy **[TEKSHIRILSIN]** deb belgilangan.
>
> ⚠️ **O'zgarish (2026-10-25):** backend endi **Supabase** (Postgres + Auth + Storage + Edge Functions). Prisma, MinIO, Redis va Next.js API qatlami o'rniga nima kelgani [04-supabase-va-vaqt-rejasi.md](04-supabase-va-vaqt-rejasi.md) da yozilgan. Ma'lumotlar bazasining amaldagi holati: [02-malumotlar-bazasi.md](02-malumotlar-bazasi.md).

---

## 0. Qisqacha

**vakil** ("Sizning raqamli vakilingiz") — hujjatlar va davlat xizmatlari bo'yicha AI hamroh.
Bitta yadro, ikkita kirish nuqtasi: **veb-sayt (PWA)** va **Telegram bot**.
Xizmatlar kodga yozilmaydi: ular admin paneldagi **versiyalanadigan konfiguratsiya** bo'ladi.

Asosiy tamoyillar:
1. **AI o'qiydi, kod tasdiqlaydi.** Aniq qoidani (o'lcham, format, sana, MRZ nazorat raqami) har doim kod tekshiradi. AI faqat noaniq ishlarni bajaradi: sifat, muhr, mos kelish.
2. **Manbasiz javob yo'q.** Har bir huquqiy da'vo `legal_sources` jadvalidagi yozuvga (havola + "tekshirilgan sana") bog'lanadi.
3. **Inson tasdig'i.** Topshirish, holatni o'zgartirish va to'lov kabi muhim harakatlarni AI faqat *taklif qiladi*. Ularni inson tasdiqlaydi.
4. **Hujjat mazmuni o'zgartirilmaydi.** AI rasm yoki hujjat mazmunini tahrir qilmaydi va soxtalashtirmaydi.
5. **Ma'lumot O'zbekistonda saqlanadi.** Barcha shaxsiy ma'lumotlar O'zbekistondagi serverda turadi (5-bo'lim).

---

## 1. Tizim arxitekturasi

```
      Foydalanuvchi (brauzer / PWA)                 Telegram
                 │                                     │
                 ▼                                     ▼
        ┌──────────────────┐                  ┌──────────────────┐
        │ apps/web         │                  │ apps/bot         │
        │ Next.js (App     │                  │ grammY, webhook  │
        │ Router) UI + API │                  │                  │
        └────────┬─────────┘                  └────────┬─────────┘
                 │  umumiy paketlar: core · ai · db · docgen · i18n
     ┌───────────┼──────────────────┬──────────────────┘
     ▼           ▼                  ▼
 PostgreSQL    Redis             S3 (MinIO)
 + pgvector    + BullMQ          shaxsiy bucket, shifrlangan
     ▲           │
     │           ▼
     │   ┌──────────────────┐       ┌────────────────────────┐
     └───│ apps/worker      │──────▶│ services/vision (Python│
         │ AI tekshiruv,    │       │ FastAPI + MediaPipe +  │
         │ hujjat yaratish, │       │ OpenCV): yuz geometriyasi,│
         │ bildirishnoma,   │       │ fon tekshiruvi         │
         │ eslatmalar,      │       └────────────────────────┘
         │ bilim bazasi     │       ┌────────────────────────┐
         │ indeksatsiyasi   │──────▶│ Gotenberg: DOCX → PDF  │
         └────────┬─────────┘       └────────────────────────┘
                  │                 ┌────────────────────────┐
                  │                 │ ClamAV: fayl antivirus │
                  │                 └────────────────────────┘
   ───────────────┼──── O'zbekistondagi data-markaz chegarasi ────
                  ▼
  Tashqi API'lar: Claude API · Eskiz SMS · Click / Payme / Uzum ·
                  Telegram Bot API · (keyinroq) OneID, my.gov.uz, E-IMZO
```

### 1.1 Monorepo tuzilmasi (pnpm workspaces + Turborepo)

```
vakil/
├─ apps/
│  ├─ web/          Next.js: barcha sahifalar + API route handlerlar (BFF)
│  ├─ worker/       BullMQ worker: og'ir va fon vazifalari
│  └─ bot/          Telegram bot (grammY)
├─ packages/
│  ├─ db/           Prisma sxemasi, migratsiyalar, seed
│  ├─ core/         domen mantig'i: xizmat konfiguratsiyasi (Zod), qoidalar
│  │                dvigateli, boj kalkulyatorlari, buyurtma holat mashinasi,
│  │                topshirish adapterlari, shifrlash
│  ├─ ai/           Claude mijozi, RAG, promptlar, toollar, eval to'plamlari
│  ├─ docgen/       docxtemplater, PDF, paket (ZIP) yig'ish
│  ├─ i18n/         uz-Latn / uz-Cyrl / ru matnlari + transliteratsiya
│  └─ ui/           dizayn tokenlari, shadcn/ui asosidagi komponentlar
├─ services/
│  └─ vision/       Python mikroxizmati (faqat foto geometriyasi)
├─ docs/            shu hujjatlar
└─ docker-compose.yml   postgres, redis, minio, gotenberg, clamav, vision
```

### 1.2 Muhim texnik qarorlar (sizning tasdig'ingiz kerak)

| # | Qaror | Tavsiyam | Muqobil | Nega |
|---|---|---|---|---|
| Q1 | Backend | **Next.js API + alohida worker** | NestJS | Bitta freymvork, kamroq kod. Domen mantig'i `packages/core`da turadi, kerak bo'lsa keyin NestJS'ga ko'chiriladi. |
| Q2 | Embedding | **O'zimizda BGE-M3** (O'zbekistondagi serverda) | Voyage AI API | Anthropic'da embedding modeli yo'q. O'zimizda turgan model bilan foydalanuvchi savollari chet elga embedding uchun chiqmaydi. O'zbek tilidagi sifati — **[TEKSHIRILSIN]** (1-bosqichda o'lchanadi). |
| Q3 | Qidiruv | **Gibrid**: pgvector + Postgres full-text + RRF | faqat vektor | O'zbek tili uchun embedding sifati noma'lum. Kalit so'z qidiruvi ("99-modda") ham kerak. |
| Q4 | Foto geometriyasi | **Python mikroxizmati** (MediaPipe) | Brauzerda MediaPipe | Serverda qayta tekshirish shart, chunki mijozdan kelgan natijaga ishonib bo'lmaydi. Brauzerdagi tekshiruv faqat tezkor maslahat uchun qo'shiladi. |
| Q5 | Autentifikatsiya | **Telefon + SMS OTP (Eskiz)**, Telegram Login. Operator va admin uchun TOTP 2FA majburiy | Auth.js / Better Auth | O'zbekistonda asosiy identifikator — telefon. OneID keyinroq qo'shimcha provayder bo'ladi. |
| Q6 | DOCX → PDF | **Gotenberg** (LibreOffice, o'zimizda) | tashqi servis | Hujjatlar serverdan chiqmaydi. |

---

## 2. Xizmatlar katalogi: modulli konfiguratsiya

Xizmat ikki qismdan iborat: `services` (doimiy yozuv: slug, toifa, belgilar) va `service_versions` (konfiguratsiya JSON'i).
Konfiguratsiya **Zod sxemasi** bilan tekshiriladi va **versiyalanadi**. Har bir buyurtma o'zi boshlangan versiyaga "qotiriladi". Qoidalar o'zgarsa, eski buyurtmalar qaysi qoida bo'yicha tayyorlangani saqlanib qoladi.

Konfiguratsiya tarkibi (misol tuzilma; qiymatlar ataylab bo'sh yoki [TEKSHIRILSIN]):

```jsonc
{
  "slug": "aliment-davo-arizasi",
  "category": "sud-va-huquq",
  "title":       { "uz_latn": "Aliment undirish bo'yicha da'vo arizasi", "uz_cyrl": "…", "ru": "…" },
  "description": { "uz_latn": "…", "uz_cyrl": "…", "ru": "…" },
  "badges": ["NEW"],                         // TREND | NEW | DEADLINE_SOON
  "legalBasis": [                            // legal_sources jadvaliga havola
    { "sourceId": "…", "role": "asosiy" }    // masalan: Oila kodeksi, modda — [TEKSHIRILSIN]
  ],
  "questions": [                             // dinamik savollar oqimi
    { "id": "children_count", "type": "number", "required": true,
      "label": { "uz_latn": "Nechta farzand uchun?" }, "showIf": null },
    { "id": "defendant_income_known", "type": "boolean", "required": true }
  ],
  "requirements": [                          // service_requirements jadvaliga yoziladi
    { "code": "birth_certificate", "required": true,
      "accept": ["application/pdf", "image/jpeg", "image/png"], "maxSizeMb": 10,
      "rules": [
        { "engine": "RULE", "code": "mime_in" },
        { "engine": "AI",   "code": "stamp_present" },
        { "engine": "AI",   "code": "names_match", "params": { "with": "answers.child_full_name" } }
      ] }
  ],
  "fees": { "calculator": "court_duty_v1", "sourceId": "…" },   // formula kodda, stavkalar ref_values'da — [TEKSHIRILSIN]
  "deadlines": [],                                               // [TEKSHIRILSIN]
  "templates": ["aliment_davo_v1"],
  "submission": { "methods": ["SELF", "OPERATOR"], "portalUrl": "[TEKSHIRILSIN]" },
  "pipeline": ["COLLECTED", "AI_CHECKED", "CLIENT_APPROVED", "OPERATOR_REVIEWED",
               "SUBMITTED", "AWAITING_RESPONSE", "COMPLETED"]
}
```

**Boj va to'lov kalkulyatorlari.** Formulalar kodda nomlangan funksiya bo'ladi (`court_duty_v1`). Ularning parametrlari `ref_values` jadvalida turadi: bazaviy hisoblash miqdori (BHM), stavkalar va boshqalar. Har bir parametrda `amal qilish sanasi` va `manba` bor. BHM yoki stavka o'zgarsa, kod emas, faqat jadval yangilanadi.

**Manbalar jadvali (`legal_sources`).** Ustunlar: qonun nomi, modda, lex.uz havolasi, iqtibos, `last_checked_at`, kim tekshirgani, holat (`VERIFIED` / `NEEDS_REVIEW`). Admin panel 90 kundan beri tekshirilmagan manbalarni qizil bilan ko'rsatadi (muddat sozlanadi).

### 2.1 Bilim bazasini to'ldirish (lex.uz)

Shartlarga ko'ra ruxsatsiz scraping taqiqlangan, shuning uchun:
- **MVP:** admin kerakli qonun matnini qo'lda kiritadi yoki rasmiy fayl qilib yuklaydi (har bir hujjat uchun URL va sana bilan). Pipeline matnni **moddalar bo'yicha** bo'laklarga ajratadi, kirill matnni lotinga normallashtiradi va embedding hisoblaydi.
- **Parallel:** lex.uz yurituvchisidan (Adliya vazirligi tizimi) rasmiy ma'lumot olish ruxsati yoki API so'raladi — **[TEKSHIRILSIN: kimga murojaat qilinadi]**.
- Bilim bazasi har safar yangilanganda bo'laklarning `content_hash`i solishtiriladi. O'zgargan moddaga bog'liq xizmatlar "qayta tekshirish kerak" holatiga tushadi.

---

## 3. AI qismi

Model: **`claude-opus-5-5`** (Claude Opus 5.5 — hozirgi eng yangi Opus). Model nomi `.env`da (`ANTHROPIC_MODEL`), kodda emas. Rasmiy SDK: `@anthropic-ai/sdk`.

API bo'yicha majburiy texnik qoidalar (joriy API holatiga ko'ra):
- *Adaptive thinking* doim yoqiq. Har bir yo'nalish uchun `effort` aniq beriladi, chunki standart qiymat `medium`. Boshlang'ich sozlama: chat `medium`; hujjat tekshiruvi va yaratish `high`. Keyin eval natijalariga qarab o'zgartiriladi.
- `tool_choice: auto` + `strict: true` sxemalar ishlatiladi. Majburiy tool tanlash (`any`/`tool`) bu modelda 400 xato qaytaradi.
- `stop_reason === "refusal"` har doim tekshiriladi. Server tomonidagi zaxira (`fallbacks: "default"`) yoqiladi — buni sizga ochiq aytyapman, xohlasangiz o'chiramiz.
- Chat javoblari *streaming* bilan uzatiladi. Tizim prompti va toollar *prompt caching* bilan keshlanadi: barqaror qism oldinda, RAG bo'laklari undan keyin.

### 3.1 Hamroh-chat (RAG + manbalar)

```
savol → normallashtirish (kirill→lotin, til aniqlash)
      → gibrid qidiruv: top-k bo'lak (qonunlar + xizmat konfiguratsiyalari)
      → Claude: bo'laklar `document` blok sifatida, citations yoqilgan
      → har bir iqtibos → knowledge_chunk → legal_source
      → ko'rinish: «Oila kodeksi, 99-modda (lex.uz, tekshirilgan: 2026-…)»
```

**Kod bilan qo'riqlash (deterministik):**
- Javobda bitta ham iqtibos bo'lmasa, u "Aniq ma'lumot topilmadi" xabariga almashtiriladi va foydalanuvchiga inson yordami taklif qilinadi.
- Javobdagi har bir modda raqami olingan bo'laklar ichida bo'lishi shart, aks holda javob bloklanadi. Bu "o'ylab topilgan modda"ga qarshi himoya.
- Model `suggest_service` tooli orqali xizmatni taklif qiladi. Unda `serviceId` faqat mavjud xizmatlar ro'yxatidan (enum) tanlanadi.
- `escalate_to_lawyer` tooli sababni enum'dan tanlaydi: `CRIMINAL`, `LARGE_AMOUNT`, `DEADLINE_MISSED`, `OTHER`. Shu bilan birga kalit so'z qoidalari ham ishlaydi. "Katta summa" chegarasi admin sozlamasida — **[TEKSHIRILSIN: qiymatni siz belgilaysiz]**.
- Bepul tarif limiti (kuniga N savol) `usage_counters` jadvali bilan hisoblanadi.

### 3.2 Hujjat tekshiruvi (qoidalar + vision)

| Bosqich | Kim tekshiradi | Misol |
|---|---|---|
| 1. Fayl xavfsizligi | ClamAV + magic bytes | Fayl turi kengaytmasiga mos-mosligi, virus |
| 2. Aniq qoidalar | kod (`sharp`) | JPEG, 600×600, ≤ 240 KB, rang rejimi |
| 3. Geometriya | `services/vision` (MediaPipe) | bosh balandligi %, ko'z chizig'i %, fon oqligi |
| 4. MRZ | Claude o'qiydi → `mrz` kutubxonasi nazorat raqamlarini tekshiradi | pasport raqami, tug'ilgan sana, amal muddati |
| 5. Sifat va mazmun | Claude vision (`output_config.format` bilan qat'iy JSON) | xiralik, yaltirash, ko'zoynak, muhr/imzo bor-yo'qligi |
| 6. Hujjatlararo moslik | kod + Claude | anketadagi ism pasportdagi ism bilan mosmi |

Natija `checks` jadvaliga yoziladi: har bir mezon uchun `PASS`, `FAIL` yoki `WARN`, o'lchangan qiymat va oddiy o'zbekcha "qanday tuzatish" maslahati.
**Taqiq:** AI rasmni tahrirlamaydi (fon almashtirish, retush yo'q). Ruxsat etilgani faqat foydalanuvchi so'raganda geometrik kesish va o'lchamni kichraytirish. DV qoidalariga mosligi — **[TEKSHIRILSIN]**.
**Cheklov:** "rasm oxirgi 6 oyda olingan" degan talabni texnik isbotlab bo'lmaydi, chunki EXIF yo'q bo'lishi yoki o'zgartirilgan bo'lishi mumkin. Shu sabab foydalanuvchi buni o'zi tasdiqlaydi (checkbox).

### 3.3 Hujjat yaratish

1. Har bir xizmat uchun advokat ko'rib chiqqan DOCX shablon olinadi (`docxtemplater`).
2. AI faqat **erkin matn bo'limlarini** yozadi (masalan, da'vo asoslari faktlari), rasmiy o'zbek tilida va faqat foydalanuvchi bergan faktlar asosida.
3. Qonun havolalarini AI **o'zi yozmaydi**: u tool sxemasidagi enum orqali olingan bo'laklar ID'laridan birini tanlaydi. Modda nomi va matni bazadan qo'yiladi.
4. Mijoz HTML ko'rinishda ko'radi, tahrirlaydi va tasdiqlaydi. Shundan keyin DOCX va Gotenberg orqali PDF yaratiladi, so'ng **paket** (ZIP: hujjatlar + yo'riqnoma PDF) yig'iladi.

### 3.4 AI agentlar (tool use) va inson tasdig'i

Toollar ikki xil bo'ladi:
- **O'qish toollari** avtomatik ishlaydi: `get_order`, `list_requirements`, `run_checks`, `search_knowledge`.
- **Yozish toollari** `agent_actions` jadvaliga `PROPOSED` holatda yoziladi va inson UI'da tasdiqlagandan keyingina bajariladi: `fill_form_field`, `build_package`, `update_status`, `schedule_reminder`, `notify_client`.

Agent tsiklini o'zimiz yozamiz (manual loop). Shunda har bir tool chaqiruvi audit jurnaliga tushadi.

### 3.5 Prompt injection himoyasi

Yuklangan hujjat ichidagi matn — bu **ma'lumot, buyruq emas**. Tizim prompti buni aniq aytadi. Lekin asosiy himoya arxitekturada: yozish harakatlari baribir inson tasdig'idan o'tadi.

### 3.6 AI test to'plamlari

`packages/ai/evals/<funksiya>/` papkasida `valid.jsonl`, `invalid.jsonl` va `edge.jsonl` fayllari bo'ladi. Baholash imkon qadar kod bilan qilinadi: iqtibos bormi, modda olingan bo'laklar ichidami, manba bo'lmaganda "topilmadi" deyiladimi, rad etish holatlari to'g'rimi.
⚠️ Eval'larni ishga tushirish API uchun pul sarflaydi, shuning uchun har safar oldin sizdan ruxsat so'rayman.

---

## 4. Topshirish (submission) qatlami

```ts
interface SubmissionAdapter {
  method: "API" | "OPERATOR" | "SELF";
  prepare(order): Promise<Package>;          // paket + yo'riqnoma
  submit(order, consent): Promise<Receipt>;  // ariza raqami
  pollStatus?(order): Promise<StatusUpdate>;
}
```

- **SELF** — paket va qadamma-qadam yo'riqnoma beriladi. Mijoz topshirgach, ariza raqamini o'zi kiritadi.
- **OPERATOR** — buyurtma operator navbatiga tushadi. Operator rasmiy saytda **qo'lda** topshiradi, keyin ariza raqami va dalilni (skrinshot yoki kvitansiya) yuklaydi. Mijozga **darhol** SMS va Telegram xabari boradi. Har bir harakat audit jurnalida qayd etiladi.
- **API** — `MyGovAdapter`, `ESudAdapter`, `OneIdAuth` interfeyslari tayyorlanadi. Ruxsat va kalitlar bo'lmaguncha ular `NotConfigured` xatosini qaytaradi. E-SUD va my.gov.uz integratsiya shartlari — **[TEKSHIRILSIN]**.
- **Taqiqlar** (kodda ham, operator yo'riqnomasida ham): CAPTCHA'ni aylanib o'tish, bot yoki RPA bilan davlat saytini avtomatlashtirish, ruxsatsiz scraping.
- **Sudda vakillik** faqat litsenziyali hamkor advokat orqali, ishonchnoma yoki order bilan amalga oshiriladi. Platformaning o'zi vakil bo'lmaydi. Ishonchnoma talablari — **[TEKSHIRILSIN]**.
- "Siz topshiring" uchun alohida rozilik olinadi: SMS-OTP bilan tasdiqlanadi, keyinroq E-IMZO bilan ham. Roziliklar `consents` jadvalida matn versiyasi va xeshi bilan saqlanadi.

---

## 5. Huquqiy va xavfsizlik

### 5.1 Ma'lumotlarni O'zbekistonda saqlash
- "Shaxsiy ma'lumotlar to'g'risida"gi qonunning **27¹-moddasi** (2021-yil o'zgartirish) fuqarolarning shaxsiy ma'lumotlarini O'zbekiston hududidagi texnik vositalarda saqlash va bazani davlat reyestrida ro'yxatdan o'tkazishni talab qiladi. Aniq matni va joriy tahriri — **[TEKSHIRILSIN: lex.uz]**.
- Barcha ma'lumot (PostgreSQL, S3, Redis, zaxira nusxalar) O'zbekistondagi data-markazda turadi. Provayder: **[hosting — siz tanlaysiz]**.
- ⚠️ **Asosiy huquqiy xavf.** Claude API AQSh/EI'da ishlaydi (O'zbekiston hududi variantlarda yo'q). Hujjat tekshiruvi uchun pasport rasmi Anthropic'ga yuboriladi. Bu *saqlash* emas, *qayta ishlash uchun uzatish*, lekin transchegaraviy uzatish qoidalari amaliyotda hali noaniq. Biz shunday qilamiz:
  (a) **alohida "AI xizmatiga yuborish" roziligi** olamiz;
  (b) imkon bo'lsa, faqat kerakli qismni yuboramiz (minimizatsiya);
  (c) rozilik berilmasa, foydalanuvchi faqat kod bilan tekshiruv va operator tekshiruviga o'tadi.
  **Ishga tushirishdan oldin advokat xulosasi kerak — [TEKSHIRILSIN].**
- Sentry va PostHog: shaxsiy ma'lumotlar tozalanadi (scrub). Hujjat va to'lov sahifalarida sessiya yozuvi o'chiriladi. Iloji bo'lsa, ikkalasi ham o'zimizda (self-host) turadi.

### 5.2 Roziliklar (har biri alohida, versiyali)
Oferta · shaxsiy ma'lumotlarni qayta ishlash · AI xizmatiga yuborish · "Siz topshiring" · ishonchnoma · marketing (ixtiyoriy).

### 5.3 Xavfsizlik choralari
| Talab | Amalga oshirish |
|---|---|
| Rollar | `CLIENT`, `OPERATOR`, `LAWYER`, `ADMIN`. Har bir so'rovda egalik tekshiriladi (IDOR'ga qarshi). |
| 2FA | Operator va admin uchun TOTP majburiy. |
| Shifrlash | Diskda (at-rest) + ilova darajasida AES-256-GCM: pasport raqami, JShShIR, javoblar, OCR natijalari. Qidirish uchun HMAC "blind index". |
| Fayllar | Shaxsiy bucket, 5 daqiqalik imzoli havolalar, ClamAV, MIME tekshiruvi, hajm limiti. |
| Audit | `audit_logs` faqat qo'shiladi (UPDATE/DELETE huquqi yo'q). Har bir yozuvda oldingi yozuv xeshi saqlanadi, shuning uchun o'zgartirish iz qoldiradi. |
| OWASP Top 10 | Zod bilan kirish validatsiyasi, CSP, CSRF, xavfsiz cookie, Prisma (SQL injection'ga qarshi), SSRF filtri. |
| Rate limiting | Redis sliding window: OTP, chat, yuklash va login uchun. |
| O'chirish huquqi | Foydalanuvchi "ma'lumotlarimni o'chirish" tugmasini bosadi. Qonun saqlashni talab qiladigan to'lov yozuvlari bundan mustasno — saqlash muddati **[TEKSHIRILSIN]**. |
| Avtomatik o'chirish | Buyurtma yakunlangandan N kun o'tib fayllar o'chiriladi. N — **[siz belgilaysiz]**. |
| Zaxira | Har kuni shifrlangan `pg_dump` + WAL, S3 nusxasi O'zbekistondagi boshqa joyda. Tiklash har oy sinab ko'riladi. |

### 5.4 Doimiy ogohlantirish (har bir xizmat sahifasida)
> "Platforma ma'lumot va hujjat tayyorlashda yordam beradi, advokat xizmati o'rnini bosmaydi."

---

## 6. DV (Green Card) trend moduli — joriy holat ⚠️

Bugun (2026-10-25) qidiruv natijalari:
- AQSh hukumati 2025-yil oxirida DV dasturini to'xtatgan edi, shuning uchun DV-2027 ro'yxati 2025-yil oktabrida ochilmagan.
- *Red Eagle Law v. Rubio* (S.D. Cal., 3:26-cv-04738) ishi bo'yicha 2026-yil 14-oktabrda chiqarilgan sud qarori Davlat departamentini majbur qiladi:
  - ro'yxat tafsilotlarini **29-oktabrgacha** e'lon qilish;
  - ro'yxatni **1-noyabrgacha 30 kunga** ochish;
  - g'oliblarni **3-dekabrgacha** xabardor qilish.
- Fragomen'ga ko'ra, yo'riqnomada **$1 to'lov** va **amaldagi pasport** talabi bo'lishi "ehtimoli bor". Hukumat apellyatsiya berishi mumkin.
- **Bularning hammasi — [TEKSHIRILSIN].** Rasmiy e'lon dvprogram.state.gov va travel.state.gov saytlarida chiqqanidan keyin konfiguratsiyaga kiritiladi.

Foto talablari (600×600, ≤ 240 KB, JPEG, oq fon, ko'zoynaksiz, bosh balandligi 50–69 %, ko'z chizig'i 56–69 %, 6 oy ichida olingan) konfiguratsiyada manba bilan saqlanadi. Ular ham DV-2027 yo'riqnomasi chiqqach **qayta tekshiriladi**.

**Strategik masala (sizning qaroringiz):** ro'yxat taxminan 1-noyabrdan 1-dekabrgacha ochiq bo'ladi. To'liq platforma bu muddatga tayyor bo'lmaydi. Variantlar:
- **A (tavsiyam):** "DV tezkor modul" — landing + bepul foto va pasport tekshiruvi + "o'zingiz topshiring" yo'riqnomasi + natija eslatmasi obunasi. Unda pullik "biz topshiramiz" xizmati bo'lmaydi. Bu 0-bosqichdan keyin darhol qilinadi, ~2 hafta.
- **B:** belgilangan tartibda qurish, DV moduli DV-2028 ga mo'ljallanadi.

Har ikkala variantda ham doimiy ogohlantirish bo'ladi: *"Biz AQSh hukumati bilan bog'liq emasmiz. Rasmiy ariza faqat dvprogram.state.gov saytida…"*. Bayroq va gerb ishlatilmaydi, g'oliblik kafolatlanmaydi.

---

## 7. Dizayn tizimi (logotipdan olindi)

| Token | Qiymat | Ishlatilishi |
|---|---|---|
| `--vakil-blue` | `#1B3B6F` | asosiy rang, sarlavhalar, asosiy tugma (oq matn bilan 11,0:1 ✅) |
| `--tasdiq-green` | `#23B26D` | ✅ belgilar, progress, ikonkalar. **Matn rangi sifatida emas**: qog'oz fonda 2,5:1 ❌, oq matn bilan 2,7:1 ❌ |
| `--tasdiq-green-text` | `#0F7A45` | yashil matn uchun to'q variant (qog'oz fonda ≈ 4,9:1 ✅) |
| `--paper` | `#F7F5F0` | fon (ko'k matn bilan 10,1:1 ✅) |
| Shrift | Manrope ExtraBold / Medium | Kirill alifbosi bor. O'zbek lotinidagi `oʻ gʻ` (U+02BB) belgisi bor-yo'qligi — **[TEKSHIRILSIN]**, 1-bosqichda sinab ko'riladi |

Qoidalar: tugmalar kamida 44 px, har bir oqimda progress ko'rsatkichi, WCAG AA, mobil birinchi. Uslub sokin va "qog'ozli" — davlat saytiga o'xshamaydi.

---

## 8. Integratsiyalar

| Integratsiya | Bosqich | Eslatma |
|---|---|---|
| Claude API | 2–5 | `@anthropic-ai/sdk` |
| Eskiz SMS | 0 | SMS shablonlari moderatsiyadan o'tishi kerak — **[TEKSHIRILSIN]** |
| Telegram Bot API | 8 (bildirishnomalar 6-bosqichda) | grammY, webhook |
| Click, Payme, Uzum | 6 | Summalar tiyinda saqlanadi. Fiskal chek va MXIK (IKPU) kodi — **[TEKSHIRILSIN]** |
| OneID | keyin | shartnomadan keyin, adapter tayyor turadi |
| my.gov.uz, E-SUD | keyin | adapter interfeysi, kalitlar keyin qo'shiladi |
| E-IMZO | keyin | rozilik va ishonchnomani imzolash adapteri |
| Sentry, PostHog | 0 | PII tozalanadi |

---

## 9. Bosqichlar (sizning tartibingiz + 0-bosqich)

| # | Bosqich | Natija |
|---|---|---|
| **0** | Poydevor | monorepo, docker-compose, DB va migratsiyalar, auth (OTP), i18n (3 til), dizayn tokenlari, layout, audit jurnali, `.env.example` |
| 1 | Katalog va ma'lumot sahifalari | bosh sahifa, katalog, xizmat sahifasi, manbalar bloki, seed: 7 toifa |
| 2 | AI hamroh-chat | bilim bazasi, gibrid qidiruv, iqtiboslar, qo'riqlash, eval |
| 3 | Hujjat yaratish | sud arizalari va shartnomalar shablonlari, tahrir → DOCX/PDF → paket |
| 4 | Hujjat tekshiruvi | qoidalar dvigateli, vision servis, MRZ, ✅/❌ ekrani, eval |
| 5 | DV trend moduli | landing, teskari sanoq, obuna, foto tekshiruvi |
| 6 | Kabinet, kuzatish, to'lov | vaqt chizig'i, "Hujjatlarim", eslatmalar, Click/Payme/Uzum |
| 7 | "Siz topshiring" + operator paneli | navbat, rozilik, dalil yuklash, operator bilan chat |
| 8 | Telegram bot | chat, holat xabarlari, obuna |
| 9 | Obuna, reklama, hamkorlar | tariflar, "Reklama" belgisi, komissiyani ochiq aytish |
| 10 | Admin panel | xizmat konstruktori, manbalar, shablonlar, trendlar, audit |

Admin panelning **minimal qismi** (xizmat va manba qo'shish) 1-bosqichdayoq kerak bo'ladi. To'liq admin panel 10-bosqichda tayyor bo'ladi.
Har bir bosqichdan keyin to'xtayman va nima qilinganini hamda qanday test qilishni tushuntiraman.

---

## 10. Sizdan kerakli qarorlar va qiymatlar

| # | Savol | Hozircha |
|---|---|---|
| 1 | Q1–Q6 texnik qarorlar | tavsiyalar bilan davom etaman |
| 2 | DV: A yoki B varianti | A |
| 3 | Hosting provayderi (O'zbekiston) | dev'da lokal Docker |
| 4 | Bepul tarif: kuniga N ta savol | `FREE_CHAT_DAILY_LIMIT` — [siz belgilaysiz] |
| 5 | Premium narxi (so'm/oy) | `plans` jadvalida — [siz belgilaysiz] |
| 6 | Bir martalik xizmatlar narxlari | `price_offers` — [siz belgilaysiz] |
| 7 | Fayllarni avtomatik o'chirish muddati (kun) | [siz belgilaysiz] |
| 8 | Domen va brend yozilishi ("vakil") | logotipdagidek kichik harf bilan |
