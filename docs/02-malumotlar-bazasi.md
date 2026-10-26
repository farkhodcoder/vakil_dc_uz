> **ESKIRGAN (2026-10-26):** mahsulot faqat DV mashq saytiga o‘zgardi — amaldagi hujjat: [07-dv-mashq.md](07-dv-mashq.md).

# vakil — ma'lumotlar bazasi (Supabase)

> Holat: **QURILDI va TEST QILINDI** · 2026-10-25
> Loyiha: `vakil` · ref `zovvohvvsqzovvmewwyx` · mintaqa `eu-central-1` (Frankfurt) · PostgreSQL 17 + pgvector
> ⚠️ Faqat TEST ma'lumot. Real foydalanuvchilar kelishidan oldin baza O'zbekistondagi serverga (self-hosted Supabase) ko'chiriladi — 01-arxitektura.md, 5.1.

Manba sxema: [`supabase/migrations/`](../supabase/migrations/) (11 ta migratsiya, ketma-ket qo'llanadi).
TypeScript tiplari: [`packages/db/src/database.types.ts`](../packages/db/src/database.types.ts) (generatsiya qilingan).
Smoke test: [`supabase/tests/smoke_rls_state_machine.sql`](../supabase/tests/smoke_rls_state_machine.sql) — **24/24 PASS**.

## Migratsiyalar

| # | Fayl | Nima qiladi |
|---|---|---|
| 0001 | `extensions_enums` | pgvector, pgcrypto, `private` sxema, 33 enum, yangi obyektlar standart holatda yopiq |
| 0002 | `profiles_catalog` | profillar, manbalar, `ref_values`, katalog, xizmat versiyalari, talablar, shablonlar, narxlar, trendlar |
| 0003 | `orders_documents` | buyurtmalar, vaqt chizig'i, hujjatlar, chat, tekshiruvlar, yaratilgan hujjatlar, roziliklar, AI harakatlari |
| 0004 | `billing_knowledge_notifications` | tariflar, to'lovlar, hamkorlar, reklama, bilim bazasi (vector + full-text), AI chat, bildirishnoma, eslatma |
| 0005 | `auth_helpers_audit` | rol yordamchilari (2FA bilan), `auth.users → profiles` trigger, audit jurnali (xesh zanjiri) |
| 0006 | `order_state_machine` | ruxsat etilgan o'tishlar jadvali va `transition_order()` |
| 0007 | `rls_policies` | 36 jadvalda RLS va ustun darajasidagi ruxsatlar |
| 0008 | `storage` | 5 ta bucket va fayl siyosatlari |
| 0009 | `seed_reference` | 6 toifa, 2 tarif, DV manbalari, DV xizmati (qoralama), DV-2027 trendi (nofaol) |
| 0010 | `fk_indexes` | advisor tavsiyasi: indekssiz FK'lar |
| 0011 | `fix_initial_step_cast` | smoke test topgan xatoni tuzatish |

## Foydalanuvchilar
Supabase Auth'da **`auth.users`** (telefon, sessiya, MFA) va **`public.profiles`** (rol, til, Telegram, shifrlangan JShShIR) bor. Yangi foydalanuvchi ro'yxatdan o'tganda profil trigger orqali avtomatik yaratiladi, telefon `+998…` formatida saqlanadi.
Rollar: `client`, `operator`, `lawyer`, `admin`. Xodim huquqlari **faqat 2FA (`aal2`) bilan** ishlaydi.

## Jadvallar (36)

| Guruh | Jadvallar |
|---|---|
| Foydalanuvchi | `profiles` |
| Manbalar | `legal_sources` (havola + "tekshirilgan sana"), `ref_values` (BHM, stavkalar — sana va manba bilan) |
| Katalog | `categories`, `services`, `service_versions`, `service_version_sources`, `service_requirements`, `doc_templates`, `price_offers` |
| Trendlar | `trends`, `trend_subscriptions` |
| Buyurtma | `orders`, `order_transitions`, `order_steps`, `order_messages`, `documents`, `checks`, `generated_docs`, `consents`, `agent_actions` |
| Pul | `plans`, `subscriptions`, `payments`, `usage_counters`, `partners`, `referrals`, `ads`, `ad_stats` |
| AI | `knowledge_documents`, `knowledge_chunks` (vector(1024) + tsvector), `chat_sessions`, `chat_messages` |
| Xizmat | `notifications`, `reminders`, `audit_logs` |

## Bazaning o'zi kafolatlaydigan qoidalar
Bu qoidalarni ilovadagi xato ham, `service_role` kaliti ham chetlab o'ta olmaydi:

| Qoida | Qanday |
|---|---|
| Buyurtma holati faqat ruxsat etilgan yo'nalishda va to'g'ri rol bilan o'zgaradi | `transition_order()` + `orders_guard_status` trigger |
| "Siz topshiring" rejimida ariza raqami va dalilsiz "Topshirildi" qo'yib bo'lmaydi | funksiya tekshiruvi + `CHECK` cheklovi |
| Ariza raqami mijozga darhol yuboriladi | har bir o'tishda `notifications` navbatiga web, SMS (+ Telegram) yozuvi |
| AI faqat taklif qiladi, inson tasdiqlaydi | `agent_actions`: `proposed` holatidan boshqasi `decided_by` talab qiladi |
| Audit jurnalini o'zgartirib yoki o'chirib bo'lmaydi | trigger'lar (UPDATE/DELETE/TRUNCATE taqiq) + sha256 xesh zanjiri, `verify_audit_chain()` |
| Muhim jadvallardagi har bir o'zgarish auditga yoziladi | 14 jadvalda trigger. Shifrlangan, xesh va shaxsiy maydonlar yozilmaydi |
| Reklama kabinet, hujjat va to'lov sahifalariga qo'yilmaydi | `ads.placements` faqat oq ro'yxatdagi joylarni qabul qiladi |
| Manba "tekshirilgan sana"siz `verified` bo'lmaydi | `CHECK` cheklovi |
| Litsenziyasi tekshirilmagan advokat faol bo'lmaydi | `CHECK` cheklovi |
| Narxi belgilanmagan tarif faollashtirilmaydi | `CHECK` cheklovi |
| Joriy versiya boshqa xizmatga tegishli bo'lolmaydi | kompozit FK |

## Kim nimani ko'radi (RLS)

| Rol | Ko'radi | Yoza oladi |
|---|---|---|
| `anon` (mehmon) | faol katalog, nashr qilingan xizmatlar, manbalar, faol trend, tarif va reklama | — |
| `client` | yuqoridagilar + o'z profili, buyurtmalari, hujjatlari, to'lovlari, chati, bildirishnomalari | o'z ismi va tili, qoralama buyurtma, o'z papkasiga fayl, buyurtma chati, trend obunasi |
| `operator` + 2FA | "Siz topshiring" buyurtmalari va o'ziga biriktirilganlar | dalil yuklash, holatni o'zgartirish (`transition_order`), chat |
| `lawyer` + 2FA | o'ziga biriktirilgan buyurtmalar | holat, chat |
| `admin` + 2FA | hammasi, audit jurnali ham | katalog, manbalar, narxlar, trendlar, hamkorlar, reklama |
| `service_role` (Edge Functions) | hammasi | hammasi, lekin holat mashinasi va audit unga ham amal qiladi |

Rol, telefon, shifrlangan maydonlar va buyurtma holatini mijoz to'g'ridan-to'g'ri o'zgartira olmaydi: ustun darajasidagi `GRANT` bunga ruxsat bermaydi.

## Fayllar (Storage)

| Bucket | Ochiq? | Limit | Kim yozadi |
|---|---|---|---|
| `documents` | yo'q | 10 MB; PDF, JPEG, PNG, WEBP, HEIC | mijoz (faqat `{o'z_id}/…`) |
| `generated` | yo'q | 25 MB; PDF, DOCX, ZIP | server |
| `evidence` | yo'q | 10 MB | operator (2FA, buyurtmaga kirish huquqi bilan) |
| `templates` | yo'q | 5 MB; DOCX | admin |
| `public-assets` | **ha** | 2 MB; rasmlar | admin |

Fayllarni qayta yozish mijozlarga yopiq, shuning uchun yuklangan dalil keyin o'zgartirilmaydi.

## Advisor natijasi
- **Xavfsizlik:** 1 ta ogohlantirish. `transition_order()` RPC kirgan foydalanuvchiga ochiq. Bu **ataylab** qilingan: funksiya ichida rol, 2FA, o'tish jadvali va rejim qoidalari tekshiriladi. Smoke test buni tasdiqladi (T2d, T3b, T5c, T5f).
- **Tezlik:** indekssiz FK'lar tuzatildi. "Ishlatilmagan indeks" ogohlantirishlari bo'sh baza uchun normal holat.
