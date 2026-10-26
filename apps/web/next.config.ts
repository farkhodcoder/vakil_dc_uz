import type { NextConfig } from "next";

/**
 * To'liq statik sayt (output: "export"): istalgan statik hostingda ishlaydi — GitHub Pages ham.
 * Server qismi yo'q: kirish va to'lov brauzerdan Supabase'ga, Click webhook — Supabase Edge Function
 * (supabase/functions/click). Xavfsizlik sarlavhalari statik hostingda qo'yilmaydi —
 * CSP <meta> orqali (src/lib/csp.ts), production hostingda sarlavha sifatida ham qo'shish tavsiya etiladi.
 *
 * NEXT_PUBLIC_BASE_PATH — sayt pastki yo'lda bo'lsa (GitHub Pages: "/<repo>"), domen ildizida — bo'sh.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  // Cache Components (PPR) statik eksport bilan mos emas — hamma sahifa build paytida to'liq tayyorlanadi
  transpilePackages: ["@vakil/db", "@vakil/dv-photo"],
  experimental: {
    // Til tashqarisidagi noma'lum yo'llar uchun brendlangan 404 (export'da 404.html bo'ladi)
    globalNotFound: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
