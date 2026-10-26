/**
 * Ommaviy oferta va maxfiylik siyosati — LOYIHA.
 * [TEKSHIRILSIN] Yakuniy matn huquqshunos tomonidan tekshirilsin (Fuqarolik kodeksi — ommaviy oferta va
 * aksept, "Iste'molchilar huquqlarini himoya qilish to'g'risida"gi va "Shaxsga doir ma'lumotlar to'g'risida"gi
 * qonunlar, pulni qaytarish tartibi va muddatlari). Raqamli muddatlar ataylab yozilmagan.
 * O'rinbosarlar: {company} {inn} {address} {email} {phone} {location} {price} {updated}
 */
import type { Lang } from "@/i18n/locales";
import type { LegalKind } from "./legal-kinds";

export { LEGAL_KINDS, type LegalKind } from "./legal-kinds";

export interface LegalDoc {
  title: string;
  draftNote: string;
  updatedLabel: string;
  sections: { h: string; p: string[] }[];
}

type DocLang = "uz" | "ru" | "en";

const LEGAL: Record<DocLang, Record<LegalKind, LegalDoc>> = {
  uz: {
    oferta: {
      title: "Ommaviy oferta",
      draftNote: "Hujjat loyihasi: rekvizitlar va yakuniy matn ishga tushirishdan oldin tasdiqlanadi.",
      updatedLabel: "Tahrir sanasi",
      sections: [
        {
          h: "1. Taraflar",
          p: [
            "Ushbu oferta {company} (STIR: {inn}, manzil: {address}; keyingi o‘rinlarda — Ijrochi) tomonidan vakil xizmatidan foydalanuvchi har qanday shaxsga (keyingi o‘rinlarda — Foydalanuvchi) taklif qilinadi.",
          ],
        },
        {
          h: "2. Xizmat mazmuni",
          p: [
            "Ijrochi Foydalanuvchiga AQSh Diversity Visa (Green Card) lotereyasi elektron arizasini to‘ldirishni mashq qilish uchun onlayn o‘quv vositasini taqdim etadi: pasport ma’lumotlarini ko‘chirish, fotoni tayyorlash va tekshirish, anketani rasmiy formadagi tartibda to‘ldirish, xatolarni ko‘rsatish va PDF namuna.",
            "Ijrochi AQSh hukumati bilan bog‘liq emas, arizani Foydalanuvchi nomidan topshirmaydi, yuridik maslahat bermaydi va lotereyada g‘olib bo‘lishni kafolatlamaydi. Rasmiy ariza faqat dvprogram.state.gov saytida topshiriladi.",
          ],
        },
        {
          h: "3. Narx va to‘lov",
          p: [
            "Bitta mashq narxi — {price} so‘m. To‘lov Click to‘lov tizimi orqali amalga oshiriladi.",
            "Bitta to‘lov bitta mashq huquqini beradi. Mashq vaqt bilan cheklanmaydi va «Successful» natija bilan yakunlanganda tugaydi. Keyingi mashq uchun yangi to‘lov talab qilinadi.",
          ],
        },
        {
          h: "4. Aksept",
          p: ["To‘lovni amalga oshirish ushbu oferta shartlariga to‘liq va so‘zsiz rozilik (aksept) hisoblanadi."],
        },
        {
          h: "5. Xizmat ko‘rsatilishi",
          p: [
            "Mashq huquqi to‘lov Click tomonidan tasdiqlangandan so‘ng Foydalanuvchi kabinetida paydo bo‘ladi. Xizmat mashq «Successful» natija bilan yakunlanganda ko‘rsatilgan hisoblanadi.",
          ],
        },
        {
          h: "6. Pulni qaytarish",
          p: [
            "To‘lov yechilgan, ammo mashq huquqi berilmagan bo‘lsa, Foydalanuvchi {email} manziliga murojaat qiladi va pul amaldagi qonunchilik va Click qoidalariga muvofiq qaytariladi.",
          ],
        },
        {
          h: "7. Javobgarlik",
          p: [
            "Foydalanuvchi rasmiy saytga kiritadigan ma’lumotlarning to‘g‘riligi uchun o‘zi javobgar. Avtomatik tekshiruvlar yordamchi vosita bo‘lib, yakuniy qarorni rasmiy tizim qabul qiladi.",
          ],
        },
        {
          h: "8. Aloqa",
          p: ["Email: {email}. Telefon: {phone}."],
        },
      ],
    },
    maxfiylik: {
      title: "Maxfiylik siyosati",
      draftNote: "Hujjat loyihasi: rekvizitlar va yakuniy matn ishga tushirishdan oldin tasdiqlanadi.",
      updatedLabel: "Tahrir sanasi",
      sections: [
        {
          h: "1. Biz nimani saqlaymiz",
          p: [
            "Google orqali kirganingizda: email manzil va Google bergan profil ma’lumotlari (ism, profil rasmi havolasi) — Supabase Auth hisob yozuvida.",
            "To‘lovlar: summa, holat, sana va Click tranzaksiya raqamlari. Mashqlar: nechta mashq ochiq va yakunlangan.",
          ],
        },
        {
          h: "2. Biz nimani saqlamaymiz",
          p: [
            "Pasport ma’lumotlari, pasport skani, fotolar va anketa javoblari serverga yuborilmaydi. Ular faqat brauzeringiz xotirasida (sessionStorage) turadi va oyna yopilganda o‘chadi. Foto tahlili va PDF namuna qurilmangizning o‘zida tayyorlanadi.",
          ],
        },
        {
          h: "3. Maqsad",
          p: ["Hisobga kirish, to‘lovni qabul qilish va mashq huquqini hisobga olish."],
        },
        {
          h: "4. Uchinchi tomonlar",
          p: [
            "Google — kirish uchun; Click — to‘lov uchun; Supabase — ma’lumotlar bazasi va autentifikatsiya ({location}). Reklama yoki analitika xizmatlariga ma’lumot berilmaydi.",
          ],
        },
        {
          h: "5. Cookie fayllar",
          p: ["Faqat kirish sessiyasi va tanlangan til uchun zarur cookie fayllar ishlatiladi."],
        },
        {
          h: "6. Huquqlaringiz",
          p: ["Ma’lumotlaringiz haqida so‘rash yoki hisobingizni o‘chirish uchun {email} manziliga yozing."],
        },
        {
          h: "7. Aloqa",
          p: ["{company}, {address}. Email: {email}."],
        },
      ],
    },
  },
  ru: {
    oferta: {
      title: "Публичная оферта",
      draftNote: "Проект документа: реквизиты и окончательный текст будут утверждены до запуска.",
      updatedLabel: "Дата редакции",
      sections: [
        {
          h: "1. Стороны",
          p: [
            "Настоящая оферта предлагается {company} (ИНН: {inn}, адрес: {address}; далее — Исполнитель) любому лицу, использующему сервис vakil (далее — Пользователь).",
          ],
        },
        {
          h: "2. Предмет",
          p: [
            "Исполнитель предоставляет онлайн-инструмент для тренировки заполнения электронной заявки на лотерею Diversity Visa (Green Card) США: перенос паспортных данных, подготовка и проверка фото, заполнение анкеты в порядке официальной формы, указание ошибок и PDF-образец.",
            "Исполнитель не связан с правительством США, не подаёт заявку от имени Пользователя, не оказывает юридических консультаций и не гарантирует выигрыш. Официальная заявка подаётся только на сайте dvprogram.state.gov.",
          ],
        },
        {
          h: "3. Цена и оплата",
          p: [
            "Стоимость одной тренировки — {price} сумов. Оплата производится через платёжную систему Click.",
            "Одна оплата даёт право на одну тренировку. Тренировка не ограничена по времени и завершается результатом «Successful». Для следующей тренировки требуется новая оплата.",
          ],
        },
        {
          h: "4. Акцепт",
          p: ["Совершение оплаты означает полное и безоговорочное согласие (акцепт) с условиями настоящей оферты."],
        },
        {
          h: "5. Оказание услуги",
          p: [
            "Право на тренировку появляется в кабинете Пользователя после подтверждения оплаты Click. Услуга считается оказанной, когда тренировка завершена с результатом «Successful».",
          ],
        },
        {
          h: "6. Возврат средств",
          p: [
            "Если оплата списана, но право на тренировку не предоставлено, Пользователь обращается по адресу {email}, и средства возвращаются в соответствии с законодательством и правилами Click.",
          ],
        },
        {
          h: "7. Ответственность",
          p: [
            "Пользователь сам отвечает за правильность данных, вводимых на официальном сайте. Автоматические проверки — вспомогательный инструмент; окончательное решение принимает официальная система.",
          ],
        },
        { h: "8. Контакты", p: ["Email: {email}. Телефон: {phone}."] },
      ],
    },
    maxfiylik: {
      title: "Политика конфиденциальности",
      draftNote: "Проект документа: реквизиты и окончательный текст будут утверждены до запуска.",
      updatedLabel: "Дата редакции",
      sections: [
        {
          h: "1. Что мы храним",
          p: [
            "При входе через Google: адрес email и данные профиля, переданные Google (имя, ссылка на фото профиля), — в учётной записи Supabase Auth.",
            "Оплаты: сумма, статус, дата и номера транзакций Click. Тренировки: сколько открыто и завершено.",
          ],
        },
        {
          h: "2. Что мы не храним",
          p: [
            "Паспортные данные, скан паспорта, фото и ответы анкеты не отправляются на сервер. Они хранятся только в памяти вашего браузера (sessionStorage) и удаляются при закрытии вкладки. Анализ фото и PDF-образец создаются на вашем устройстве.",
          ],
        },
        { h: "3. Цель", p: ["Вход в аккаунт, приём оплаты и учёт права на тренировку."] },
        {
          h: "4. Третьи стороны",
          p: [
            "Google — для входа; Click — для оплаты; Supabase — база данных и аутентификация ({location}). Данные не передаются рекламным и аналитическим сервисам.",
          ],
        },
        { h: "5. Cookie", p: ["Используются только необходимые cookie: сессия входа и выбранный язык."] },
        { h: "6. Ваши права", p: ["Чтобы запросить сведения о своих данных или удалить аккаунт, напишите на {email}."] },
        { h: "7. Контакты", p: ["{company}, {address}. Email: {email}."] },
      ],
    },
  },
  en: {
    oferta: {
      title: "Public offer",
      draftNote: "Draft document: company details and final text will be confirmed before launch.",
      updatedLabel: "Last updated",
      sections: [
        {
          h: "1. Parties",
          p: [
            "This offer is made by {company} (Tax ID: {inn}, address: {address}; the “Provider”) to any person using the vakil service (the “User”).",
          ],
        },
        {
          h: "2. Service",
          p: [
            "The Provider offers an online training tool for practicing the U.S. Diversity Visa (Green Card) lottery electronic entry: copying passport details, preparing and checking the photo, filling in the form in the official order, pointing out mistakes and a PDF sample.",
            "The Provider is not affiliated with the U.S. Government, does not submit entries on the User's behalf, does not give legal advice and does not guarantee selection. The official entry is submitted only at dvprogram.state.gov.",
          ],
        },
        {
          h: "3. Price and payment",
          p: [
            "One practice costs {price} UZS. Payment is made via the Click payment system.",
            "One payment grants one practice. A practice has no time limit and ends with a “Successful” result. A new payment is required for the next practice.",
          ],
        },
        { h: "4. Acceptance", p: ["Making a payment constitutes full and unconditional acceptance of this offer."] },
        {
          h: "5. Delivery",
          p: [
            "The practice appears in the User's account after Click confirms the payment. The service is deemed delivered when the practice ends with a “Successful” result.",
          ],
        },
        {
          h: "6. Refunds",
          p: [
            "If a payment was charged but no practice was granted, the User contacts {email} and the money is refunded in accordance with applicable law and Click's rules.",
          ],
        },
        {
          h: "7. Liability",
          p: [
            "The User is responsible for the accuracy of the data entered on the official website. Automatic checks are an aid; the final decision is made by the official system.",
          ],
        },
        { h: "8. Contact", p: ["Email: {email}. Phone: {phone}."] },
      ],
    },
    maxfiylik: {
      title: "Privacy policy",
      draftNote: "Draft document: company details and final text will be confirmed before launch.",
      updatedLabel: "Last updated",
      sections: [
        {
          h: "1. What we store",
          p: [
            "When you sign in with Google: your email address and the profile data Google provides (name, profile picture link) — in the Supabase Auth account record.",
            "Payments: amount, status, date and Click transaction numbers. Practices: how many are open and completed.",
          ],
        },
        {
          h: "2. What we do not store",
          p: [
            "Passport details, the passport scan, photos and form answers are never sent to a server. They stay only in your browser's memory (sessionStorage) and are erased when you close the tab. Photo analysis and the PDF sample are made on your device.",
          ],
        },
        { h: "3. Purpose", p: ["Signing in, accepting payments and keeping track of practice credits."] },
        {
          h: "4. Third parties",
          p: [
            "Google — for sign-in; Click — for payments; Supabase — database and authentication ({location}). No data is shared with advertising or analytics services.",
          ],
        },
        { h: "5. Cookies", p: ["Only essential cookies are used: the sign-in session and the selected language."] },
        { h: "6. Your rights", p: ["To ask about your data or delete your account, write to {email}."] },
        { h: "7. Contact", p: ["{company}, {address}. Email: {email}."] },
      ],
    },
  },
};

/** oz → o'zbek (lotin) matni, tr → ingliz matni (izoh bilan) */
const DOC_LANG: Record<Lang, DocLang> = { uz: "uz", oz: "uz", ru: "ru", en: "en", tr: "en" };

export function legalDoc(lang: Lang, kind: LegalKind): { doc: LegalDoc; docLang: DocLang } {
  const docLang = DOC_LANG[lang];
  return { doc: LEGAL[docLang][kind], docLang };
}

export function fillLegal(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
}
