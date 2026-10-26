> **ESKIRGAN (2026-10-26):** mahsulot faqat DV mashq saytiga o‘zgardi — amaldagi hujjat: [07-dv-mashq.md](07-dv-mashq.md).

# vakil — sahifalar xaritasi (tasdiq uchun)

**Tillar va URL.** Til URL prefiksi bilan beriladi: `/uz` (lotin, asosiy), `/oz` (kirill), `/ru`. Bu davlat portallarida odatiy konvensiya.
Quyidagi jadvallarda prefiks yozilmagan: `/katalog` aslida `/uz/katalog` degani.
**Reklama** faqat ✅ belgilangan sahifalarda chiqadi va doim "Reklama" yorlig'i bilan bo'ladi. Kabinet, hujjat va to'lov sahifalarida reklama **hech qachon** chiqmaydi (kodda oq ro'yxat bilan cheklanadi).

## 1. Ochiq sahifalar

| URL | Sahifa | Asosiy bloklar | Reklama | Bosqich |
|---|---|---|---|---|
| `/` | **Bosh sahifa** | katta qidiruv "Muammongizni yozing…" (AI chatga yoki xizmatga olib boradi) · "Hozir dolzarb" (teskari sanoq bilan) · 7 toifa · "Qanday ishlaydi" (6 qadam) · ishonch bloki (manbalar, ogohlantirish) · narxlar qisqacha | ❌ (sokin bo'lsin) | 1 |
| `/katalog` | **Katalog** | toifalar, qidiruv, "Trend / Yangi / Muddat yaqin" filtrlari | ✅ | 1 |
| `/katalog/[toifa]` | Toifa | xizmatlar ro'yxati | ✅ | 1 |
| `/xizmat/[slug]` | **Xizmat sahifasi** | oddiy tushuntirish · huquqiy asos (qonun, modda, havola, "tekshirilgan: sana") · kerakli hujjatlar · boj kalkulyatori · muddatlar · jarayon bosqichlari · narxlar (bepul / paket / "biz topshiramiz") · **"Boshlash"** tugmasi · ogohlantirish | ✅ (yon panel) | 1 |
| `/dolzarb/[slug]` | **Trend landing** (masalan DV) | doimiy ogohlantirish banneri · teskari sanoq · talablar · bepul foto tekshiruvi · "O'zingiz bepul topshirishingiz mumkin" · obuna (Telegram/SMS) · FAQ · SEO va OG teglari | ✅ (pastda) | 5 |
| `/chat` | **AI hamroh** | chat · har bir javob ostida manbalar · "Shu xizmatni boshlash" kartasi · "Advokatga murojaat" · kunlik limit hisoblagichi | ❌ | 2 |
| `/narxlar` | **Narxlar** | Bepul / Premium · bir martalik xizmatlar · hamkorlar komissiyasi haqida ochiq ma'lumot | ❌ | 9 |
| `/hamkorlar` | Hamkorlar | advokat, notarius, tarjimonlar (litsenziya belgisi bilan) | ❌ | 9 |
| `/kirish` | Kirish | telefon → SMS kod · Telegram orqali kirish | ❌ | 0 |
| `/oferta`, `/maxfiylik`, `/qaytarish`, `/rozilik/[turi]` | Huquqiy matnlar | versiyali matnlar (rozilik `textHash` shu matnlardan olinadi) | ❌ | 0 |
| `/haqimizda` | Biz haqimizda | missiya, "advokat o'rnini bosmaydi" ogohlantirishi, aloqa | ❌ | 1 |

## 2. Ariza oqimi (kirish talab qilinadi, reklama yo'q)

Har bir sahifaning tepasida **progress ko'rsatkichi** bo'ladi: Savollar → Hujjatlar → Tekshiruv → Hujjat → Paket → Topshirish.
Ariza saqlanib boradi, uni istalgan vaqtda davom ettirish mumkin.

| URL | Sahifa | Mazmuni | Bosqich |
|---|---|---|---|
| `/ariza/[id]/savollar` | **Savol-javob oqimi** | bitta ekranda bitta savol · oddiy so'zlar · "Nega so'rayapmiz?" izohi · shartli savollar (`showIf`) | 3 |
| `/ariza/[id]/hujjatlar` | Hujjat yuklash | har bir talab uchun alohida karta · kameradan olish (mobil) · namuna rasm | 4 |
| `/ariza/[id]/tekshiruv` | **Tekshiruv natijasi** | har bir mezon bo'yicha ✅ / ❌ · o'lchangan qiymat ("bosh balandligi: 72 % — kerak: 50–69 %") · "Qanday tuzatish" · qayta yuklash | 4 |
| `/ariza/[id]/hujjat` | Hujjat ko'rish va tahrirlash | yaratilgan ariza yoki shartnoma · tahrirlanadigan maydonlar · ishlatilgan moddalar (manba bilan) · "Tasdiqlayman" | 3 |
| `/ariza/[id]/paket` | **Paket** | ZIP / PDF yuklab olish · tanlov: **"O'zim topshiraman"** (qadamma-qadam yo'riqnoma + rasmiy portal havolasi) yoki **"Siz topshiring"** (narx, rozilik, SMS-OTP, kerak bo'lsa ishonchnoma) | 3 / 7 |
| `/ariza/[id]/tolov` | To'lov | Click / Payme / Uzum · summa oldindan ko'rsatiladi · chek · qaytarish siyosatiga havola | 6 |
| `/ariza/[id]` | **Kuzatish** | ariza raqami eng tepada · vaqt chizig'i (sana, vaqt, bajaruvchi, izoh, dalil) · operator bilan chat · keyingi qadam | 6 |

## 3. Kabinet (kirish talab qilinadi, reklama yo'q)

| URL | Sahifa | Mazmuni | Bosqich |
|---|---|---|---|
| `/kabinet` | Bosh panel | faol arizalar · yaqinlashayotgan muddatlar · eslatmalar | 6 |
| `/kabinet/arizalar` | Arizalarim | ro'yxat va holat filtrlari | 6 |
| `/kabinet/hujjatlarim` | **Hujjatlarim** | barcha tayyor va yuklangan hujjatlar · muddati tugayotganlar (pasport, guvohnoma) · eslatmani yoqish | 6 |
| `/kabinet/obuna` | Obuna va to'lovlar | tarif · to'lovlar tarixi · cheklar | 9 |
| `/kabinet/sozlamalar` | Sozlamalar | profil · til · Telegram'ni ulash · bildirishnomalar · roziliklar (ko'rish va qaytarib olish) · **"Ma'lumotlarimni o'chirish"** | 6 |

## 4. Operator va advokat paneli (`OPERATOR` / `LAWYER` roli, 2FA majburiy)

| URL | Sahifa | Mazmuni | Bosqich |
|---|---|---|---|
| `/operator` | Navbat | holat, xizmat va muddat (SLA) bo'yicha filtr · biriktirish | 7 |
| `/operator/ariza/[id]` | **Ariza ishi** | mijoz ma'lumotlari (har bir ochilish auditga yoziladi) · hujjatlar va tekshiruvlar · rozilik va ishonchnoma dalili · AI takliflari (`agent_actions`: tasdiqlash yoki rad etish) · **"Topshirildi"** tugmasi: ariza raqami va dalil yuklash majburiy → mijozga darhol SMS va Telegram · holatni yangilash · mijoz bilan chat | 7 |
| `/advokat` | Advokat ishlari | chatdan yo'naltirilgan murakkab holatlar · biriktirilgan sud ishlari · shablonni "ko'rib chiqildi" deb belgilash | 9 |

## 5. Admin panel (`ADMIN` roli, 2FA majburiy)

| URL | Bo'lim | Mazmuni | Bosqich |
|---|---|---|---|
| `/admin/xizmatlar` | **Xizmat konstruktori** | konfiguratsiya muharriri (Zod xatolarini ko'rsatadi) · savollar oqimini ko'rish · versiyalar va farqlari · nashr qilish | 1 (minimal) → 10 |
| `/admin/manbalar` | **Manbalar** | qonun, modda, havola, "tekshirilgan sana" · eskirganlar qizil rangda · "Tekshirdim" tugmasi | 1 (minimal) → 10 |
| `/admin/qiymatlar` | Ma'lumotnoma qiymatlari | BHM, stavkalar (sana va manba bilan) | 3 |
| `/admin/shablonlar` | Shablonlar | DOCX yuklash · o'zgaruvchilar xaritasi · test ma'lumot bilan sinash | 3 |
| `/admin/bilim-bazasi` | Bilim bazasi | qonun matnini kiritish · bo'laklarni ko'rish · qayta indekslash · "bu modda o'zgardi" ogohlantirishi | 2 |
| `/admin/trendlar` | Trendlar | belgilar, muddatlar, landing muharriri, obunachilar soni, xabar yuborish | 5 |
| `/admin/foydalanuvchilar` | Foydalanuvchilar | rollar, bloklash, o'chirish so'rovlari | 10 |
| `/admin/hamkorlar`, `/admin/reklama` | Hamkorlar va reklama | litsenziya tekshiruvi, komissiya matni · reklama joylari va statistika | 9 |
| `/admin/tariflar`, `/admin/tolovlar` | Moliya | tariflar va narxlar · to'lovlar va qaytarishlar | 9 |
| `/admin/audit` | **Audit jurnali** | filtrlar · xesh zanjiri yaxlitligini tekshirish | 10 |
| `/admin/ai` | AI sifati | eval natijalari · rad etishlar · token sarfi | 10 |

## 6. Telegram bot (8-bosqich, bildirishnomalar 6-bosqichdan)

| Buyruq yoki oqim | Vazifasi |
|---|---|
| `/start` (+ deep-link) | kirish, akkauntni veb bilan bog'lash |
| Erkin savol | o'sha RAG chat (manbalar bilan, limit bilan) |
| `/arizalarim` | holatlar, ariza raqamlari |
| Holat xabarlari | har bir `order_steps` o'zgarishida avtomatik |
| `/dolzarb` | trendlar, "Muddat ochilganda xabar bering" |
| Kelajakda | Telegram Mini App ichida ariza oqimi |

## 7. PWA
O'rnatiladigan ilova (manifest, ikonka logotipdan olinadi). Ochiq sahifalar oflayn keshlanadi. Shaxsiy hujjatlar **keshlanmaydi**.
