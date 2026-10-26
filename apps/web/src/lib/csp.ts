/**
 * Content-Security-Policy — statik hostingda <meta http-equiv> orqali.
 * 'unsafe-inline' — Next.js ichki skriptlari uchun (nonce statik saytda mumkin emas).
 * 'wasm-unsafe-eval' — brauzerdagi MediaPipe (foto tekshiruvi) uchun.
 * frame-ancestors <meta> da ishlamaydi — production hostingda sarlavha sifatida qo'shing.
 */
export function contentSecurityPolicy(): string {
  const isDev = process.env.NODE_ENV === "development";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self' ${supabaseUrl}${isDev ? " ws: wss:" : ""}`.trim(),
    "worker-src 'self' blob:",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}
