# vakil — DV (Green Card) mashq sayti

> Holat: **2026-10-26** — Click kalitlari va domen ulanishigacha tayyor.
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

```
Brauzer (Next.js 16, mijoz)                  Supabase (Postgres + Auth + Vault)
 ├─ mashq holati: sessionStorage              ├─ auth.users        (Google: email, ism)
 ├─ MediaPipe (foto tahlili, /mediapipe)      ├─ payments          (summa, holat, Click ID'lari)
 ├─ PDF: pdf-lib + Noto Sans (/fonts)         ├─ practice_sessions (1 to'lov = 1 mashq)
 └─ rpc: create_practice_payment,             ├─ payment_events    (Click so'rovlari jurnali)
         my_practice, complete_practice       └─ vault: click_secret_key, click_service_id
                                                       ▲
Next.js server                                         │ rpc (publishable kalit)
 ├─ /api/click/prepare   ◀── Click serveri ────────────┤  imzo md5 + holat — bazada,
 ├─ /api/click/complete  ◀── Click serveri ────────────┘  bitta tranzaksiyada (FOR UPDATE)
 └─ server action: to'lov yaratish → my.click.uz/services/pay
```

Veb-serverda **maxfiy kalit yo'q**: Click SECRET_KEY faqat Supabase Vault'da. Imzoni bazadagi `private.click_handle` tekshiradi.

## 3. Sahifalar

| Yo'l | Nima | Kirish |
|---|---|---|
| `/{til}` | Bosh sahifa: DV mashq, narx, maxfiylik, FAQ | ochiq |
| `/{til}/kirish` | Google bilan kirish | ochiq |
| `/{til}/mashq` | Ochiq mashq bo'lsa — mashq ilovasi; bo'lmasa — to'lov (9 999 so'm) | Google |
| `/{til}/tolov/natija?id=` | Click'dan qaytish: to'lov holatini kuzatadi | Google |
| `/{til}/kabinet` | Ochiq va yakunlangan mashqlar, to'lovlar tarixi, chiqish | Google |
| `/{til}/hujjat/oferta`, `/maxfiylik` | Ommaviy oferta, maxfiylik siyosati (LOYIHA) | ochiq |
| `/{til}/sinov` | **Faqat development:** mashq UI'si kirishsiz; production'da 404 | — |
| `/auth/callback` | Google OAuth (PKCE) qaytishi | — |
| `/api/click/prepare`, `/api/click/complete` | Click SHOP API | Click |

`{til}` — `uz`, `oz`, `ru`, `en`, `tr`. Til `vakil_lang` cookie'sidan yoki `Accept-Language`'dan tanlanadi.

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
2. Click → `POST /api/click/prepare` (action=0):
   - imzo: `md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time)`;
   - summa va holat tekshiriladi;
   - javob: `merchant_prepare_id`.
3. Click → `POST /api/click/complete` (action=1):
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

1. **Google Cloud Console** → APIs & Services → Credentials → *Create OAuth client ID* (Web application).
   - Authorized redirect URI: `https://zovvohvvsqzovvmewwyx.supabase.co/auth/v1/callback`
2. **Supabase** → Authentication → Sign In / Providers → **Google**: yoqing va Client ID / Client Secret'ni kiriting.
3. Supabase → Authentication → **URL Configuration**:
   - Site URL: `https://<domen>`
   - Redirect URLs: `https://<domen>/auth/callback` va `http://localhost:3000/auth/callback`
4. "Faqat Google" uchun: Providers → **Email**'ni o'chiring. Lokal `DEV_LOGIN_*` sinovi email provayderiga bog'liq — uni faqat sinov paytida yoqing.

Kirish sahifasi Google yoqilganini o'zi aniqlaydi. Yoqilmagan bo'lsa "hali sozlanmagan" deb yozadi.

### 8.2 Click

1. Click bilan shartnoma tuzing va kabinetdan **SERVICE_ID**, **MERCHANT_ID**, **SECRET_KEY**'ni oling.
2. Click kabinetida:
   - Prepare URL: `https://<domen>/api/click/prepare`
   - Complete URL: `https://<domen>/api/click/complete`
3. Supabase → **SQL Editor** (kalitlar faqat Vault'da qoladi):
   ```sql
   select vault.create_secret('<SECRET_KEY>', 'click_secret_key');
   select vault.create_secret('<SERVICE_ID>', 'click_service_id');
   ```
4. Hosting env: `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID` (maxfiy emas).
5. **Fiskalizatsiya (OFD)** — **[TEKSHIRILSIN]**, hali ulanmagan:
   - Click `payment/ofd_data/submit_items` uchun IKPU (SPIC) kodi, qadoq kodi, QQS va TIN/PINFL kerak;
   - bu qiymatlar buxgalter bilan aniqlangach qo'shiladi.

### 8.3 Domen va hosting

- `apps/web` — Next.js 16, Node ≥ 24, pnpm.
- `prebuild` — `scripts/setup-assets.mjs`: MediaPipe modellarini SHA-256 bilan yuklaydi va shriftlarni ko'chiradi.
- Hosting env'lari: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL=https://<domen>`, `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`.
- `DEV_LOGIN_*` va `CLICK_DEV_*` production'ga **qo'yilmaydi**.

### 8.4 Huquqiy

- `apps/web/src/content/company.ts`: yuridik shaxs nomi, STIR, manzil, email, telefon.
- Oferta va maxfiylik matni — **LOYIHA**, huquqshunos tekshiradi **[TEKSHIRILSIN]**.
- **Ma'lumotlarni lokalizatsiya qilish:**
  - "Shaxsga doir ma'lumotlar to'g'risida"gi Qonun 27¹-moddasi talab qilishi mumkin: O'zbekiston fuqarolarining ma'lumotlari (bizda email) O'zbekistondagi serverda saqlanishi;
  - hozir Supabase Frankfurt'da — **ishga tushirishdan oldin huquqshunos bilan [TEKSHIRILSIN]**.

### 8.5 Tozalash (ixtiyoriy)

- Supabase Storage'dagi 5 ta bo'sh bucket — eski platformadan qolgan. SQL orqali o'chirib bo'lmadi, Dashboard'dan o'chiring.
- Edge Function `send-sms` (Eskiz) endi kerak emas — Dashboard → Edge Functions'dan o'chiring.

## 9. Testlar

```bash
pnpm --dir apps/web test          # 63: validatsiya, Click, lug'atlar (5 til), PDF (5 til), kamera ko'rsatmasi, yo'naltirish
pnpm --dir packages/dv-photo test # 47: foto qoidalari (5 til), o'lchovlar, avto-kesish
pnpm --dir apps/web typecheck && pnpm --dir apps/web lint && pnpm --dir apps/web build
```

**DB smoke test:** `supabase/tests/smoke_click_practice.sql` faylini SQL Editor'da ishga tushiring.
- Natija "xato" sifatida chiqadi: `NATIJA: 28/28 PASS …`, va hammasi rollback bo'ladi.
- Vault'da Click kaliti bor bo'lsa, test o'tkazilmaydi (SKIP).

**Lokal sinov (development):**
- `/uz/sinov` — mashq UI'si kirish va to'lovsiz. "Submit" bazaga yetmaydi.
- To'liq oqim uchun (kirish → sinov to'lovi → mashq → Successful):
  1. Supabase'da email+parolli sinov foydalanuvchi yarating.
  2. Vault'ga **sinov** kalitini qo'ying.
  3. `.env.local`'ga `DEV_LOGIN_*` va `CLICK_DEV_*`'ni yozing.
  4. Sinovdan keyin sinov foydalanuvchisi va Vault kalitini **o'chiring**: aks holda sinov kaliti bilan soxta to'lov yasash mumkin bo'ladi.

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
