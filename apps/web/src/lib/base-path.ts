/** Sayt pastki yo'lda joylashganda (GitHub Pages: "/<repo>") — public/ fayllari va to'liq URL'lar uchun */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

/** "/fonts/x.ttf" → "/vakil_dc_uz/fonts/x.ttf" (next/link o'zi qo'shadi — bu fetch va src uchun) */
export const asset = (path: string) => `${BASE_PATH}${path}`;
