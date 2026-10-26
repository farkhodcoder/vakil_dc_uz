> **ESKIRGAN (2026-10-26):** mahsulot faqat DV mashq saytiga o‘zgardi — amaldagi hujjat: [07-dv-mashq.md](07-dv-mashq.md).

# vakil — B1: kirish, xodimlar 2FA, roziliklar, trend obunasi

> 2026-10-26 · Holat: **kod tayyor va test qilingan.** Telefon orqali haqiqiy kirish uchun Supabase Dashboard'da bir necha sozlama kerak (3-bo'lim).

## 1. Nima qilindi

| Qism | Qayerda | Izoh |
|---|---|---|
| Telefon OTP | `apps/web/src/features/auth/login-flow.tsx` | `+998` + 9 raqam, 60 soniyada qayta yuborish, tushunarli xato xabarlari |
| Eskiz SMS | `supabase/functions/send-sms` (**deploy qilingan**) | Supabase "Send SMS Hook". Standard Webhooks imzosi tekshiriladi, **faqat +998** raqamlarga yuboradi (SMS-pumping himoyasi), Eskiz tokeni keshlanadi, OTP logga yozilmaydi |
| Sessiya | `src/lib/supabase/*`, `src/proxy.ts` | Cookie sessiya (`@supabase/ssr`), proxy tokenni yangilaydi, `/kabinet` kirmaganlar uchun yopiq |
| Xodimlar 2FA | `two-factor.tsx`, `/kirish/2fa`, `/kabinet/xavfsizlik` | TOTP (Google/Microsoft Authenticator). 2FA'siz xodim avtomatik o'rnatish sahifasiga yuboriladi. Bazada xodim huquqlari `aal2` siz ishlamaydi (0005) |
| Roziliklar | `0013`, `consent-flow.tsx`, `/rozilik` | Oferta va shaxsiy ma'lumot — **alohida**, oldindan belgilanmagan. Xesh bazadagi matndan, IP va qurilma server tomonida yoziladi. Qaytarib olish kabinetda |
| Huquqiy matnlar | `legal_documents`, `/hujjat/oferta`, `/hujjat/maxfiylik` | Versiyali, 3 tilda. Hozir **LOYIHA** — advokat tayyorlaydi `[TEKSHIRILSIN]` |
| Kabinet | `/kabinet` | Telefon, rol, 2FA holati, obunalar, roziliklar, chiqish |
| Trend obunasi | `trend-subscribe.tsx` (DV sahifasida) | SMS kanali (kirishda tasdiqlangan telefon). Faqat **faol** trendga; takroriy obuna yo'q (0014) |
| Bosh sahifa | `/`, `/qidiruv` | **Butun platforma**: qidiruv "Muammongizni yozing…", 6 toifa ("Tez orada"), "Qanday ishlaydi", DV — faqat "Hozir dolzarb" bloki |

**Kirishdan keyingi tartib:** 2FA (agar o'rnatilgan bo'lsa) → majburiy roziliklar → xodim bo'lsa va 2FA bo'lmasa, 2FA o'rnatish → so'ralgan sahifa. `next` parametri faqat sayt ichidagi manzilni qabul qiladi (open redirect himoyasi).

## 2. Testlar

| To'plam | Natija |
|---|---|
| `supabase/tests/smoke_consents_subscriptions.sql` | **16/16** — mehmon rozilik bera olmaydi; xesh bazadan, IP serverdan; idempotent; soxta yozuv yo'q; begona rozilik qaytarib olinmaydi; nofaol trendga obuna yo'q; takroriy obuna yo'q; begona raqamga obuna yo'q; audit zanjiri butun |
| `apps/web` vitest | **15/15** — telefon normallashtirish, open redirect himoyasi, qidiruv (kirill/lotin/rus, o'zbekcha qo'shimchalar, umumiy so'zlar) |
| Brauzer | `/kabinet` → kirishga yo'naltiradi; noto'g'ri raqam xabari; provayder o'chiq bo'lsa "SMS orqali kirish hali sozlanmagan"; qidiruv brifdagi misollarda to'g'ri bo'limni topadi |
| Production build | muvaffaqiyatli |
| Edge Function | GET → 405; sir sozlanmagan → SMS yuborilmaydi (500) |

## 3. Sizning qadamlaringiz (Supabase Dashboard, loyiha `vakil`)

1. **Authentication → Sign In / Providers → Phone** — yoqing.
   Test uchun (Eskiz'siz) **Test Phone Numbers** maydoniga misol: `998900000001=123456`. Bu raqamga SMS yuborilmaydi, kod har doim `123456` bo'ladi.
2. **Authentication → Auth Hooks → Send SMS** — HTTPS turini tanlang, URL: `https://zovvohvvsqzovvmewwyx.supabase.co/functions/v1/send-sms`. "Generate secret" bosing va qiymatni nusxalang.
3. **Edge Functions → Secrets** — quyidagilarni qo'shing:
   - `SEND_SMS_HOOK_SECRET` — 2-qadamdagi qiymat
   - `ESKIZ_EMAIL`, `ESKIZ_PASSWORD` — Eskiz kabineti
   - `ESKIZ_FROM` — Eskiz tasdiqlagan jo'natuvchi nomi
   - `SMS_OTP_TEMPLATE` (ixtiyoriy) — Eskiz'da tasdiqlangan shablon matni, `{code}` bilan. Standart matn: `vakil: tasdiqlash kodi {code}. Kodni hech kimga bermang.` — moderatsiyadan o'tishi kerak `[TEKSHIRILSIN]`
4. **Authentication → Multi-Factor** — TOTP yoqilganini tekshiring.
5. **Authentication → Rate Limits** — soatiga SMS soni (SMS narxiga qarab).
6. **Birinchi admin** — kirgandan keyin SQL Editor'da: `update public.profiles set role = 'admin' where phone = '+998XXXXXXXXX';` Keyin qayta kiring: tizim 2FA o'rnatishni so'raydi.

Shu qadamlarni bajarganingizdan keyin aytsangiz, butun oqimni (kirish → rozilik → kabinet → 2FA) birga oxirigacha sinab chiqamiz.

## 4. Hali qilinmaganlari
- **Obunachilarga xabar yuborish** (ro'yxat ochilganda SMS) — `notifications` navbatini yuboruvchi ishchi kerak (Edge Function + `pg_cron`). Bu bildirishnomalar bosqichida qilinadi.
- **Telegram orqali kirish va obuna** — 8-bosqich (Telegram bot).
- **Mehmon obunasi** (kirmasdan) — ataylab yo'q: telefonni tasdiqlamasdan SMS yuborish begona raqamlarga spam bo'lishi mumkin.
- **Huquqiy matnlar** — advokat tayyorlaydi. Matn yangilanganda yangi versiya qo'shiladi, foydalanuvchilardan qayta rozilik so'raladi.
