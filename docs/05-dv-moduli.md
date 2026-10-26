> **ESKIRGAN (2026-10-26):** mahsulot faqat DV mashq saytiga o‘zgardi — amaldagi hujjat: [07-dv-mashq.md](07-dv-mashq.md).

# vakil — DV-2027 moduli (istisno: frontend backend'dan oldin)

> 2026-10-25 · Holat: **tayyor, lekin ommaga yopiq.** Production'da sahifa 404 qaytaradi, toki trend faollashtirilmaguncha.

## 1. Nima qilindi

| Qism | Fayl | Izoh |
|---|---|---|
| Foto qoidalari yadrosi | [`packages/dv-photo`](../packages/dv-photo/src) | Sof TypeScript, bog'liqliksiz. Qoidalar **bazadagi konfiguratsiyadan** olinadi (`service_requirements.rules`), yashirin standart qiymat yo'q |
| Testlar | `packages/dv-photo/src/*.test.ts` | **38/38**: to'g'ri, noto'g'ri va chegaraviy holatlar (240 000 / 240 001 bayt, 50% / 69%, 49,9%, kadr chetiga tegish, fon chegaralari va h.k.) |
| Brauzerdagi tahlil | [`apps/web/src/features/dv-photo/analyze-photo.ts`](../apps/web/src/features/dv-photo/analyze-photo.ts) | MediaPipe: yuz nuqtalari (iyak, ko'zlar) + segmentatsiya (sochi bilan bosh tepasi, fon) |
| Foto tekshiruvchi UI | [`photo-checker.tsx`](../apps/web/src/features/dv-photo/photo-checker.tsx) | Yuklash, ✅/❌ natija, "qanday tuzatish", foto ustida yo'l-yo'riq chiziqlari, o'z-o'zini tasdiqlash ro'yxati |
| Landing | [`app/[lang]/dolzarb/[slug]/page.tsx`](../apps/web/src/app/[lang]/dolzarb/[slug]/page.tsx) | Doimiy ogohlantirish bandi, sanalar va teskari sanoq, qadamlar, talablar, shartlar, savol-javob, manbalar (holati bilan) |
| Mazmun | `supabase/migrations/0012_dv_landing_content.sql` | Qadamlar va savol-javob bazada, 3 tilda, `needs_review` holatida |
| 3 til | `apps/web/src/i18n/` | `/uz` (lotin), `/oz` (kirill), `/ru`. O'zbek tipografiyasi (o‘, g‘, ’) avtomatik |
| Dizayn | `apps/web/src/app/globals.css` | Brend tokenlari, WCAG AA kontrast, Manrope, tugmalar ≥ 44 px, mobil birinchi |

**Maxfiylik:** foto qurilmadan **chiqmaydi**. MediaPipe modellari ilovaning o'zidan beriladi (`/mediapipe`, SHA-256 bilan tekshiriladi), uchinchi tomonga so'rov yo'q. Claude API ishlatilmaydi.

**Taqiqlarga rioya:** AQSh bayrog'i yoki gerbi yo'q. G'oliblik kafolatlanmaydi (savol-javobda aniq aytilgan). Foto tahrirlanmaydi. Rasmiy sayt havolasi va "o'zingiz bepul topshirishingiz mumkin" ogohlantirishi har doim ko'rinadi.

## 2. Avtomatik va qo'lda tekshiriladigan mezonlar

| Mezon | Qanday |
|---|---|
| JPEG formati | fayl imzosi (FF D8 FF) — kengaytmaga qaralmaydi |
| 600×600 | aniq piksel o'lchami |
| ≤ 240 000 bayt | qat'iyroq talqin (kB = 1000 yoki 1024 — **[TEKSHIRILSIN]**) |
| Bitta yuz | MediaPipe Face Landmarker |
| Bosh balandligi 50–69% | segmentatsiya (bosh tepasi, soch bilan) + 152-nuqta (iyak) |
| Ko'z chizig'i pastdan 56–69% | ko'z qorachig'i nuqtalari (468, 473) |
| Oq fon | segmentatsiya niqobi bo'yicha fon piksellari. **Evristik chegaralar** (`BACKGROUND_HEURISTIC`): noaniq holatda "Diqqat" beriladi, "Mos emas" emas |
| Ko'zoynak, sifat, 6 oy | **foydalanuvchi o'zi tasdiqlaydi** (ishonchli avtomatik usul yo'q) |

**Real foto bilan sinov** (MediaPipe'ning rasmiy test portreti):

| Holat | Natija |
|---|---|
| Asl portret 820×1024 | o'lcham ❌, bosh 31,4% ❌, ko'z 82,9% ❌, fon ❌. Qo'lda o'lchash bilan mos: bosh tepasi ≈26 px, iyak ≈348 px, ko'z ≈175 px |
| Shu portret, 600×600 ga to'g'ri kadrlangan | o'lcham ✅, bosh 59,9% ✅ (maqsad 60%), ko'z 62% ✅ (maqsad 62%), fon ❌ (parda) |
| Yuzsiz oq rasm | "yuz topilmadi" ❌, fon ✅ |
| PNG | format ❌, hajm ❌ |

Tahlil davomiyligi: ~1,8 soniya. Vosita birinchi marta yuklanganda ~17 MB (WASM va modellar), keyin brauzer keshidan olinadi.

## 3. Qanday test qilish

```bash
pnpm --filter @vakil/dv-photo test
```

```bash
pnpm --filter @vakil/web dev
```

So'ng brauzerda `http://localhost:3000/uz/dolzarb/dv-2027` manzilini oching. Development'da sahifa "Ko'rib chiqish rejimi"da ochiladi (bazadagi qoralamaning nusxasi), o'z fotoingizni yuklab ko'rishingiz mumkin. `/oz/...` va `/ru/...` manzillari boshqa tillar uchun.

Production'da (`pnpm build && pnpm start`) shu manzil hozircha **404** qaytaradi — bu to'g'ri xatti-harakat.

## 4. Ommaga ochish tartibi (rasmiy e'londan keyin)

Davlat departamenti e'loni sud qaroriga ko'ra **2026-10-29 gacha** chiqishi kerak.

1. Rasmiy DV-2027 yo'riqnomasini o'qing (dvprogram.state.gov / travel.state.gov). Foto talablari, $1 to'lov, pasport talabi va sanalarni solishtiring.
2. Farq bo'lsa, `service_requirements.rules` va `service_versions.config`'ni yangilang. Konfiguratsiya o'zgarsa, yangi versiya yaratiladi.
3. Manbalarni `verified` qiling va `last_checked_at`'ni to'ldiring. Chuqur havolalarni qo'shing (travel.state.gov sahifalari).
4. `trends`: `opens_at`, `deadline_at`, `results_at` sanalarini kiriting.
5. Xizmatni nashr qiling (`service_versions.published_at`, `services.status = 'published'`), keyin trendni yoqing (`is_active = true`).
6. Sahifa keshi 1 soat ichida o'zi yangilanadi.

Admin panel hali yo'q, shuning uchun bu qadamlarni hozircha men SQL orqali bajaraman (sizning tasdig'ingiz bilan).

## 5. Hali qilinmaganlari
- **"Muddat ochilganda xabar bering" obunasi** — telefonni tasdiqlash (B1 Auth) yoki Telegram bot (B8) kerak. Jadval tayyor.
- **Kesish vositasi** (fotoni 600×600 ga keltirish) — foydalanuvchi so'raganda faqat geometrik kesish. DV qoidalariga mosligi **[TEKSHIRILSIN]**.
- **Serverda qayta tekshirish** — bepul tekshiruv uchun shart emas. Buyurtma oqimida natija operatorga borganda kerak bo'ladi.
- **CSP kuchaytirish** — `script-src 'unsafe-inline'`'ni nonce yoki SRI bilan almashtirish (production testidan keyin).
