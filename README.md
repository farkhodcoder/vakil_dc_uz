# vakil — Green Card (DV) mashq sayti

**Sayt (sinov):** https://farkhodcoder.github.io/vakil_dc_uz/ — `main`ga har push avtomatik joylashtiriladi (GitHub Actions → Pages).

> **Muhim:** mustaqil o‘quv xizmati. AQSh hukumati bilan bog‘liq emas. Rasmiy DV arizasi faqat [dvprogram.state.gov](https://dvprogram.state.gov) saytida topshiriladi.

Foydalanuvchi DV-2027 elektron arizasini rasmiy formadagi maydonlar va tartibda **mashq qiladi**:

- **Pasport:** ma'lumotlar va biografik sahifa skani.
- **Foto:** telefon kamerasida DV chiziqlari bilan, avtomatik 600×600 JPEG.
- **Anketa:** har bir xato aynan o‘sha maydonga olib boradi.
- **Natija:** "Successful" bo‘lgach PDF namuna.

1 mashq — 9 999 so‘m (Click). Kirish faqat Google orqali. Pasport, foto va anketa ma'lumotlari serverga yuborilmaydi — faqat brauzerda.

Tillar: o‘zbek (lotin), ўзбек (кирилл), русский, English, Türkçe.

## Tuzilma

| Papka | Nima |
|---|---|
| `apps/web` | Next.js 16 ilova — to'liq statik eksport (`apps/web/out`), Tailwind v4 |
| `packages/dv-photo` | Foto qoidalari, o‘lchovlar, avto-kesish (sof TS, testlar bilan) |
| `packages/db` | Supabase TypeScript turlari |
| `supabase/migrations` | Postgres sxemasi (amaldagi: `0015`, `0016`) |
| `supabase/functions/click` | Click SHOP API webhook (Prepare/Complete) — Edge Function |
| `supabase/tests` | DB smoke test (Click Prepare/Complete, RLS, "1 to‘lov = 1 mashq") |
| `docs/07-dv-mashq.md` | **Asosiy hujjat:** arxitektura, to‘lov oqimi, ishga tushirish qadamlari |

## Ishga tushirish (lokal)

Talablar: Node ≥ 24, pnpm 12.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # Supabase URL va publishable key'ni kiriting
pnpm dev                                       # http://localhost:3000/uz/
```

`predev` / `prebuild` MediaPipe modellarini (SHA-256 bilan) yuklaydi va PDF shriftlarini `public/` ga ko‘chiradi.

`pnpm --dir apps/web build` → `apps/web/out` (istalgan statik hostingga). Development'da `/{til}/sinov/` sahifasi mashq interfeysini kirish va to‘lovsiz ko‘rsatadi (production'da 404).

## Testlar

```bash
pnpm --dir apps/web test          # validatsiya, Click, 5 til lug‘atlari, PDF, kamera ko‘rsatmasi
pnpm --dir packages/dv-photo test # foto qoidalari va avto-kesish
pnpm --dir apps/web typecheck && pnpm --dir apps/web lint && pnpm --dir apps/web build
```

## Holat

Click kalitlari va domen ulanguniga qadar tayyor. Google OAuth, Click (Vault'dagi SECRET_KEY), domen, rekvizitlar va **[TEKSHIRILSIN]** bandlari — [`docs/07-dv-mashq.md`](docs/07-dv-mashq.md), 8–10-bo‘limlar.
