# vakil — DV (Green Card) mashq sayti

> Holat: **2026-10-26** — Click kalitlari va domen ulanishigacha tayyor. Sayt **to'liq statik** (GitHub Pages yoki istalgan statik hosting).
> 01–06-hujjatlar oldingi "umumiy hujjatlar platformasi" uchun yozilgan — **eskirgan**, tarix uchun qoldirildi.
> Qoida: qonun, narx, muddat o'ylab topilmaydi; ishonch to'liq bo'lmagan joy **[TEKSHIRILSIN]**.

## 1. Mahsulot

Foydalanuvchi Green Card (DV-2027) elektron arizasini rasmiy saytdan oldin **mashq qiladi**:

1. **Google bilan kirish** (Supabase Auth). Boshqa kirish usuli yo'q.
2. **9 999 so'm** — Click orqali. **1 to'lov = 1 mashq**, vaqt bilan cheklanmaydi.
3. Mashq bosqichlari:
   - **Pasport:** pasportdan ko'chirilgan ma'lumot va biografik sahifa skani (JPEG tekshiruvi).
   - **Foto:** telefon kamerasida DV chiziqlari bilan yoki fayldan. Avto-kesish orqali 600×600 JPEG, ≤240 KB.
   - **Anketa 1–2:** rasmiy E-DV formasidagi maydonlar va tartib, nomlar inglizcha + tarjima qavsda.
   - **Tekshirish:** har bir xato bosilganda **aynan o'sha maydonga** olib boradi.
4. **Successful** bo'lgach mashq yopiladi, foydalanuvchi **PDF namuna** va fotolarni yuklab oladi. Keyingi mashq uchun yana to'lov kerak.
5. **5 til:** o'zbek (lotin), ўзбек (кирилл), русский, English, Türkçe.
6. **Shaxsiy ma'lumot serverga yuborilmaydi.** Pasport, foto va anketa faqat brauzerning `sessionStorage`'ida turadi, oyna yopilganda o'chadi. Foto tahlili (MediaPipe) va PDF qurilmaning o'zida tayyorlanadi.

## 2. Arxitektura

Sayt — **to'liq statik** (Next.js `output: "export"`): server qismi yo'q, istalgan statik hostingda ishlaydi.

```
Brauzer (statik sayt: HTML/JS)                Supabase (Postgres + Auth + Vault + Edge Functions)
 ├─ kirish: Google OAuth (PKCE, brauzerda)     ├─ auth.users        (Google: email, ism)
 ├─ mashq holati: sessionStorage               ├─ payments          (summa, holat, Click ID'lari)
 ├─ MediaPipe (foto tahlili, /mediapipe)       ├─ practice_sessions (1 to'lov = 1 mashq)
 ├─ PDF: pdf-lib + Noto Sans (/fonts)          ├─ payment_events    (Click so'rovlari jurnali)
 └─ rpc (RLS): create_practice_payment,        ├─ vault: click_secret_key, click_service_id
        my_practice, complete_practice         └─ Edge Function "click" ◀── Click serveri
                                                   …/functions/v1/click/prepare | /complete
                                                   → rpc click_prepare / click_complete (imzo, holat — bazada)
```

- Maxfiy kalit saytda ham, Edge Function'da ham yo'q: Click SECRET_KEY faqat Vault'da, imzoni bazadagi `private.click_handle` tekshiradi.
- Himoyalangan sahifalar (mashq, kabinet, to'lov natijasi) sessiyani brauzerda tekshiradi; haqiqiy himoya — RLS (kirmagan foydalanuvchi hech qanday ma'lumot olmaydi).
- Statik hostingda xavfsizlik sarlavhalari qo'yilmaydi — CSP `<meta>` orqali (`src/lib/csp.ts`). O'z serveringizda (nginx va h.k.) CSP, `frame-ancestors`, `Permissions-Policy: camera=(self)` ni sarlavha sifatida ham qo'shing.

## 3. Sahifalar

| Yo'l | Nima | Kirish |
|---|---|---|
| `/` | Tilni tanlab yo'naltiradi (`public/index.html`: `vakil_lang` cookie yoki brauzer tili) | — |
| `/{til}/` | Bosh sahifa: DV mashq, narx, maxfiylik, FAQ | ochiq |
| `/{til}/kirish/` | Google bilan kirish (Google yoqilganini jonli tekshiradi) | ochiq |
| `/{til}/kirish/qaytish/` | Google (OAuth) qaytish manzili | — |
| `/{til}/mashq/` | Ochiq mashq bo'lsa — mashq ilovasi; bo'lmasa — to'lov (9 999 so'm) | Google |
| `/{til}/tolov/natija/?id=` | Click'dan qaytish: to'lov holatini kuzatadi | Google |
| `/{til}/kabinet/` | Mashqlar, to'lovlar tarixi, chiqish | Google |
| `/{til}/hujjat/oferta/`, `/maxfiylik/` | Ommaviy oferta, maxfiylik siyosati (LOYIHA) | ochiq |
| `/{til}/sinov/` | **Faqat `next dev`:** mashq UI'si kirishsiz (production build'da 404 mazmuni) | — |

`{til}` — `uz`, `oz`, `ru`, `en`, `tr`. Barcha yo'llar `/` bilan tugaydi (`trailingSlash`). GitHub Pages'da hammasi `/<repo>/` ostida (`NEXT_PUBLIC_BASE_PATH`).

## 4. Ma'lumotlar bazasi

Asosiy migratsiyalar:
- `0015_dv_practice.sql` — eski platforma obyektlarini olib tashlaydi (ular bo'sh edi) va yangi minimal sxemani quradi.
- `0016` — `click_handle`'dagi tuzatish (smoke test topgan).

| Obyekt | Vazifa |
|---|---|
| `payments` | `created → prepared → paid` yoki `cancelled`. `id` = Click `merchant_trans_id` |
| `practice_sessions` | `available → completed`. To'lov `paid` bo'lganda avtomatik yaratiladi |
| `payment_events` | Imzosi to'g'ri Click so'rovlari. O'zgartirib/o'chirib bo'lmaydi |
| `create_practice_payment()` | To'lov yozuvi (oxirgi 1 soatdagi ishlatilmaganini qayta beradi) |
| `my_practice()` | Ochiq mashq, sonlar, narx |
| `complete_practice(id)` | "Successful" → kredit sarflanadi (takroriy chaqiruv xavfsiz) |
| `click_prepare/complete(jsonb)` | Click so'rovlari: imzo, summa, holat, `-1…-9` kodlari |

RLS: foydalanuvchi faqat o'z to'lov va mashqlarini **o'qiydi**, hech narsani o'zi o'zgartira olmaydi. Narx `private.practice_price_tiyin()` = 999900 tiyin (o'zgartirish — yangi migratsiya bilan).

## 5. To'lov oqimi (Click SHOP API)

Manba: <https://docs.click.uz> — "Платежная ссылка", "SHOP API — Запросы", "Ошибки" (2026-10-26 o'qildi).

1. "Click orqali to'lash" bosiladi → `create_practice_payment()` → `https://my.click.uz/services/pay/?service_id&merchant_id&amount=9999.00&transaction_param=<payments.id>&return_url=…/tolov/natija?id=…`.
2. Click → `POST …/functions/v1/click/prepare` (action=0):
   - imzo: `md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time)`;
   - summa va holat tekshiriladi;
   - javob: `merchant_prepare_id`.
3. Click → `POST …/functions/v1/click/complete` (action=1):
   - imzo: `md5(… + merchant_prepare_id + …)`;
   - `error < 0` kelsa — to'lov bekor qilinadi va `-9` qaytadi (hujjat talabi);
   - aks holda `paid` va mashq yaratiladi.
4. Foydalanuvchi `/tolov/natija` sahifasiga qaytadi. Sahifa holatni kuzatadi: `paid` bo'lsa "Mashqni boshlash" chiqadi.

## 6. Mashq: validatsiya va xatoga olib borish

Kod: `apps/web/src/features/practice/validate.ts` (28 ta test).

Manbalar:
- **Maydonlar va tartib:** DV-2026 Federal Register xabarnomasi (89 FR 79997), "Completing Your Electronic Entry", 1–14-bandlar.
- **Pasport bo'limi:** 22 CFR 42.33(b) yangi tahriri (Final Rule, 2026-03-11, FR Doc. 2026-04737), DV-2027 dan.

Har bir xato `{qadam, maydon, kod}`. Bosilganda kerakli qadamga o'tadi, maydonga fokus beradi va uni yoritadi. Asosiy tekshiruvlar:

- **Ism va pasport:**
  - ism-familiya pasportdagi bilan solishtiriladi (apostrof va diakritikaga sezgir emas);
  - kirill harfi — xato, diakritika — ogohlantirish.
- **Sana, jins, pasport raqami/davlati/muddati** pasportdagi bilan solishtiriladi. Muddati o'tgan pasport — xato.
- **Pasport skani:** JPEG bo'lishi shart. Tik holat — ogohlantirish.
- **Foto:** avtomatik tekshiruv o'tgan va o'zi tasdiqlaydigan bandlar belgilangan bo'lishi kerak.
- **Oila:**
  - "married (spouse NOT US citizen/LPR)" holatida turmush o'rtog'i majburiy;
  - 21 yoshdan katta farzand — xato;
  - muvofiqlik turmush o'rtog'i orqali tanlansa, uning tug'ilgan davlati mos bo'lishi kerak.
- **Ta'lim** o'rta maktabdan past bo'lsa — ogohlantirish (ish tajribasi muqobili).
- **Email va telefon** formati.

## 7. Foto

- **Qoidalar** — `packages/dv-photo/src/rules.ts` (`DV_PHOTO_RULES`):
  - JPEG, 600×600, ≤240 KB, bosh 50–69 % — FR xabarnomasi;
  - ko'z chizig'i pastdan 56–69 % — foto shabloni **[TEKSHIRILSIN]**;
  - fon — evristika.
- **Avto-kesish** — `planCrop`:
  - maqsad: bosh 59,5 %, ko'z 62,5 %;
  - joy yetmasa aniq sabab qaytaradi: `too_close`, `head_cut`, `not_enough_space`;
  - yuz tahrirlanmaydi — faqat kesish va o'lcham.
- **Kamera:**
  - kvadrat ramka, bosh shabloni, ko'z oralig'i;
  - jonli ko'rsatma: "Yaqinroq keling", "Markazga", "Boshingizni to'g'ri tuting"…;
  - `Permissions-Policy: camera=(self)`;
  - telefonda faqat **https** orqali ishlaydi.

## 8. Ishga tushirish — sizdan kerak bo'ladigan qadamlar

### 8.1 Google bilan kirish

1. **Google Cloud** (Firebase loyihasi `vakil-d4f0c` — u Google Cloud loyihasi ham) → Google Auth Platform:
   - Branding: ilova nomi, email; Authorized domains: `supabase.co` (keyin o'z domeningiz).
   - Audience: External; sinov paytida Test users'ga o'z Gmail'ingiz.
   - Clients → Create client → **Web application** → Authorized redirect URI:
     `https://zovvohvvsqzovvmewwyx.supabase.co/auth/v1/callback`
2. **Supabase** → Authentication → Sign In / Providers → **Google**: yoqing, Client ID / Client Secret.
3. Supabase → Authentication → **URL Configuration**:
   - Site URL: `https://farkhodcoder.github.io/vakil_dc_uz/` (domen ulangach — domen)
   - Redirect URLs: `https://farkhodcoder.github.io/vakil_dc_uz/**` va `http://localhost:3000/**`
4. "Faqat Google" uchun: Providers → **Email**'ni o'chiring (ixtiyoriy).

Kirish sahifasi Google yoqilganini o'zi aniqlaydi (qayta build kerak emas).

### 8.2 Click

1. Click bilan shartnoma → kabinetdan **SERVICE_ID**, **MERCHANT_ID**, **SECRET_KEY**.
2. Click kabinetida (Supabase Edge Function — sayt manzili o'zgarsa ham o'zgarmaydi):
   - Prepare URL: `https://zovvohvvsqzovvmewwyx.supabase.co/functions/v1/click/prepare`
   - Complete URL: `https://zovvohvvsqzovvmewwyx.supabase.co/functions/v1/click/complete`
3. Supabase → **SQL Editor** (kalit faqat Vault'da):
   ```sql
   select vault.create_secret('<SECRET_KEY>', 'click_secret_key');
   select vault.create_secret('<SERVICE_ID>', 'click_service_id');
   ```
4. GitHub repo → Settings → Secrets and variables → Actions → **Variables**: `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID` (maxfiy emas) → keyingi push'da saytga tushadi.
5. **Fiskalizatsiya (OFD)** — [TEKSHIRILSIN], hali ulanmagan: Click `payment/ofd_data/submit_items` uchun IKPU (SPIC), qadoq kodi, QQS, TIN/PINFL kerak.

### 8.3 Hosting: GitHub Pages (hozir) va keyin

- `.github/workflows/deploy-pages.yml`: `main`'ga har push → testlar → `pnpm --dir apps/web build` → `apps/web/out` → Pages.
- Bir martalik: repo → **Settings → Pages → Source: GitHub Actions**.
- Manzil: `https://farkhodcoder.github.io/vakil_dc_uz/`
- **Diqqat:** GitHub Pages qoidalari onlayn biznes / e-commerce sayt yuritishni taqiqlaydi — vaqtinchalik sinov uchun. Haqiqiy ishga tushirishda `apps/web/out` ni istalgan statik hostingga (O'zbekistondagi server — ma'lumot lokalizatsiyasi uchun ham qulay) joylang; `NEXT_PUBLIC_BASE_PATH` bo'sh, Supabase URL Configuration'ga yangi domen.

### 8.4 Huquqiy

- `apps/web/src/content/company.ts`: yuridik shaxs nomi, STIR, manzil, email, telefon.
- Oferta va maxfiylik matni — **LOYIHA**, huquqshunos tekshiradi **[TEKSHIRILSIN]**.
- **Ma'lumotlarni lokalizatsiya qilish:**
  - "Shaxsga doir ma'lumotlar to'g'risida"gi Qonun 27¹-moddasi talab qilishi mumkin: O'zbekiston fuqarolarining ma'lumotlari (bizda email) O'zbekistondagi serverda saqlanishi;
  - hozir Supabase Frankfurt'da — **ishga tushirishdan oldin huquqshunos bilan [TEKSHIRILSIN]**.

### 8.5 Tozalash (ixtiyoriy)

- Supabase Storage'dagi 5 ta bo'sh bucket — eski platformadan qolgan. SQL orqali o'chirib bo'lmadi, Dashboard'dan o'chiring.
- Edge Function `send-sms` (Eskiz) endi kerak emas — Dashboard → Edge Functions'dan o'chiring (`click` funksiyasi kerak — qoldiring).

## 9. Testlar

```bash
pnpm --dir apps/web test          # validatsiya, Click havolasi, 5 til lug'atlari, PDF (5 til), kamera ko'rsatmasi, yo'naltirish
pnpm --dir packages/dv-photo test # foto qoidalari (5 til), o'lchovlar, avto-kesish
pnpm --dir apps/web lint && pnpm --dir apps/web typecheck && pnpm --dir apps/web build   # → apps/web/out
```

- **DB smoke test:** `supabase/tests/smoke_click_practice.sql` ni SQL Editor'da — natija "xato" sifatida: `NATIJA: 28/28 PASS …` (hammasi rollback). Vault'da Click kaliti bor bo'lsa — SKIP.
- **Click Edge Function:** `curl -X POST …/functions/v1/click/prepare` → kalit kiritilmagan bo'lsa `{"error":-8,…}` (zanjir ishlayapti).
- **Lokal:** `pnpm dev` → `http://localhost:3000/uz/` ; `/uz/sinov/` — mashq UI'si kirish va to'lovsiz.

## 10. [TEKSHIRILSIN] ro'yxati

- **DV-2027 rasmiy yo'riqnomasi** (e'lon qilinishi kutilmoqda). Solishtiriladiganlar:
  - pasport bo'limining formadagi o'rni;
  - mamlakatlar ro'yxatidagi nomlar;
  - foto talablari;
  - "No First Name" / "No Middle Name" qoidalari.
- Ko'z chizig'i 56–69 % (foto shabloni) va fon evristikasi.
- Pasport skanining hajm/o'lcham chegarasi (rasmiy manbada topilmadi — hozir faqat JPEG va yo'nalish tekshiriladi).
- Click: fiskalizatsiya (IKPU va h.k.), qaytarish tartibi.
- Oferta/maxfiylik matni, rekvizitlar, ma'lumotlarni lokalizatsiya qilish talabi.
