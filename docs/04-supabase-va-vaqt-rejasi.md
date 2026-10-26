> **ESKIRGAN (2026-10-26):** mahsulot faqat DV mashq saytiga o‘zgardi — amaldagi hujjat: [07-dv-mashq.md](07-dv-mashq.md).

# vakil — Supabase backend va vaqt rejasi

> 2026-10-25 · Qaror: **backend — Supabase**, frontend va domen — oxirida.
> Istisno: DV-2027 uchun bitta landing va foto tekshiruvi sahifasi oldinroq qilinadi.

## 1. Arxitekturadagi o'zgarishlar (01-arxitektura.md ga nisbatan)

| Oldingi reja | Endi |
|---|---|
| O'zimizdagi PostgreSQL + Prisma | **Supabase Postgres**: SQL migratsiyalar, RLS, generatsiya qilingan TS tiplari. Prisma olib tashlandi |
| O'zimiz yozgan OTP auth + TOTP | **Supabase Auth**: telefon OTP (Eskiz "Send SMS Hook" orqali) va xodimlar uchun TOTP MFA (bepul) |
| MinIO (S3) | **Supabase Storage**: 5 bucket, RLS bilan |
| Next.js API + BullMQ worker | **Supabase Edge Functions** (AI, to'lov webhook'lari, SMS, Telegram) + `pg_cron`/navbat. Next.js — faqat frontend |
| Redis | Hozircha shart emas: limitlar `usage_counters` jadvalida, Auth limitlari Supabase'da |

O'zgarmaganlar: ma'lumotlar modeli, 2FA talabi, audit, inson tasdig'i, `[TEKSHIRILSIN]` qoidasi, Claude API (`claude-opus-5-5`).

**Supabase'da ishlamaydigan qismlar** (alohida server kerak bo'ladi):
- Foto geometriyasi (MediaPipe, Python). DV uchun yechim: brauzerda MediaPipe (WASM) tezkor tekshiradi, serverda o'lcham, format, hajm va Claude vision tekshiruvi bo'ladi. To'liq server tekshiruvi keyinroq O'zbekistondagi serverda qo'shiladi.
- DOCX → PDF (Gotenberg). Hujjat yaratish bosqichida alohida konteynerda turadi.
- Embedding. BGE-M3 o'zimizdagi serverda ishlaydi yoki Voyage AI API ishlatiladi. Qaror 3-bosqichda (AI chat) qabul qilinadi.

## 2. Supabase loyiha holati

| | |
|---|---|
| Loyiha | `vakil` · `zovvohvvsqzovvmewwyx` · Frankfurt · Free tarif ($0) |
| URL | `https://zovvohvvsqzovvmewwyx.supabase.co` |
| Jadvallar | 36, hammasida RLS |
| Test | `supabase/tests/smoke_rls_state_machine.sql` — 24/24 PASS |
| AgroBil bazasi | **tegilmadi** (alohida loyiha) |

**Free tarif cheklovlari:** 7 kun faoliyat bo'lmasa loyiha to'xtatiladi, avtomatik kunlik zaxira nusxasi yo'q, baza hajmi 500 MB gacha. Tashkilotda faol loyihalar soni ham cheklangan: hozir ikkitasi band (vakil va AgroBil). Ishlab chiqish uchun yetarli, real foydalanuvchilar uchun yetarli emas.

### Qanday test qilish mumkin
1. Supabase Dashboard → **SQL Editor** → `supabase/tests/smoke_rls_state_machine.sql` mazmunini qo'yib ishga tushiring. Natija "xato" ko'rinishida chiqadi: `NATIJA: 24 / 24 PASS`. Bu ataylab qilingan, test o'zgarishlari bekor bo'ladi va bazada iz qolmaydi.
2. **Table Editor**'da 6 toifani, `dv-lotereya` xizmatini (draft) va `dv-2027` trendini (nofaol) ko'rishingiz mumkin.
3. **Advisors → Security**: faqat `transition_order` bo'yicha ogohlantirish chiqadi (ataylab, 02-hujjatda izohlangan).

### Siz qilishingiz kerak bo'lgan (Dashboard'da, keyingi bosqichda birga)
- **Authentication → Providers → Phone**: yoqish. SMS provayder sifatida "Send SMS Hook" (Eskiz Edge Function'i tayyor bo'lgach).
- **Authentication → Multi-Factor**: TOTP'ni yoqish.
- Birinchi admin: kirgandan keyin SQL Editor'da `update profiles set role = 'admin' where phone = '+998…';`.

## 3. Vaqt rejasi (taxminiy)

Ish kunlarida hisoblangan. Har bir bosqichdan keyin siz tekshirib tasdiqlaysiz.

| # | Bosqich | Backend (Supabase) | Vaqt |
|---|---|---|---|
| ✅ | **Ma'lumotlar bazasi** | sxema, RLS, audit, holat mashinasi, storage, seed, testlar | **tayyor** |
| ✅ | **B1 Auth** | telefon OTP (Eskiz hook), xodimlar 2FA, roziliklar, trend obunasi — Dashboard sozlamasi kutilmoqda ([06-b1-auth.md](06-b1-auth.md)) | **kod tayyor** |
| ✅ | **DV istisno** | foto tekshiruvi (brauzerda MediaPipe), landing sahifa ([05-dv-moduli.md](05-dv-moduli.md)) | **tayyor** |
| B2 | Katalog | o'qish API'lari, admin uchun xizmat va manba boshqaruvi | 2–3 kun |
| B3 | AI hamroh-chat | RAG, iqtiboslar, kod bilan qo'riqlash, eval to'plami | 5–7 kun |
| B4 | Hujjat yaratish | DOCX shablonlar, AI matn bo'limlari, PDF, paket | 4–6 kun |
| B5 | Hujjat tekshiruvi | MRZ, vision, qoidalar dvigateli, eval | 4–6 kun |
| B6 | To'lovlar | Click, Payme, Uzum webhook'lari, chek, obuna | 4–6 kun |
| B7 | "Siz topshiring" | operator oqimi, dalil, bildirishnomalarni yuborish | 2–3 kun |
| B8 | Telegram bot | chat, holat xabarlari, obuna | 3–4 kun |
| B9 | Reklama va hamkorlar | joylashtirish, komissiyani ochiq aytish | 2–3 kun |
| B10 | Admin backend | konstruktor, audit ko'rish, AI sifati | 3–4 kun |
| F | **Frontend** | barcha sahifalar (03-sahifalar-xaritasi.md) | 20–30 kun |
| P | **Domen va ishga tushirish** | O'zbekistondagi server (self-hosted Supabase), domen, monitoring, zaxira | 4–6 kun |
| | **Jami** | | **~60–90 ish kuni ≈ 3–4 oy** |

**Mendan tashqari, parallel ketadigan ishlar.** Ular odatda eng uzoq vaqt oladi, shuning uchun hoziroq boshlash kerak:
- Eskiz: shartnoma va SMS shablonlarini tasdiqlash — [TEKSHIRILSIN: muddat]
- Click, Payme, Uzum: merchant shartnomalari
- Advokat: oferta, maxfiylik siyosati, roziliklar matni, ma'lumotlarni chet elga uzatish (Claude API) bo'yicha xulosa, hujjat shablonlarini tekshirish
- O'zbekistondagi hosting provayderini tanlash
- Qonun matnlarini bilim bazasiga kiritish (lex.uz)

## 4. DV-2027: keyingi muhim sanalar
- **29-oktabrgacha:** Davlat departamenti ro'yxat tafsilotlarini e'lon qilishi kerak (sud qarori). E'lon chiqqach, `legal_sources` va DV konfiguratsiyasidagi `[TEKSHIRILSIN]` qiymatlari tekshiriladi, keyin trend yoqiladi.
- **1-noyabrgacha:** ro'yxat 30 kunga ochilishi kerak.
- Hukumat apellyatsiya berishi mumkin. Rasmiy e'lon bo'lmaguncha trend nofaol turadi.
