/**
 * Ijrochi (sotuvchi) rekvizitlari — ommaviy oferta va maxfiylik siyosatida ko'rsatiladi.
 * [TEKSHIRILSIN] Click bilan shartnoma tuzishdan oldin to'ldirilsin (yuridik shaxs/YaTT ma'lumotlari).
 * null qolsa sahifada "to'ldirilmagan" belgisi chiqadi.
 */
export const COMPANY = {
  /** masalan: "«Vakil» MChJ" yoki "YaTT Familiya I.O." */
  name: null as string | null,
  /** STIR (INN) */
  inn: null as string | null,
  address: null as string | null,
  email: null as string | null,
  phone: null as string | null,
  /**
   * Ma'lumotlar bazasi joylashuvi. Hozir: Supabase, Frankfurt (YeI).
   * [TEKSHIRILSIN] "Shaxsga doir ma'lumotlar to'g'risida"gi Qonun 27¹-moddasi (O'zbekiston fuqarolari
   * ma'lumotlarini O'zbekistondagi serverlarda saqlash) — ishga tushirishdan oldin huquqshunos bilan.
   */
  dataLocation: "Supabase (Frankfurt, EU)",
  /** Hujjatlar tahriri sanasi */
  updated: "2026-10-26",
} as const;

export const MISSING = "[____]";
export const value = (v: string | null) => v ?? MISSING;
