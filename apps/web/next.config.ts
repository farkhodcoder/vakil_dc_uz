import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// Nonce'siz CSP: sahifalar statik (Cache Components) qoladi.
// 'wasm-unsafe-eval' — brauzerdagi MediaPipe (foto tekshiruvi) uchun.
// form-action: to'lov tugmasi my.click.uz ga yo'naltiradi.
// TODO(production): SRI yoki nonce bilan 'unsafe-inline' ni olib tashlashni sinash.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self' ${supabaseUrl}${isDev ? " ws: wss:" : ""}`.trim(),
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://my.click.uz",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Kamera faqat o'z saytimizda — foto bosqichida suratga olish uchun
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  transpilePackages: ["@vakil/db", "@vakil/dv-photo"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icon.svg" }];
  },
};

export default nextConfig;
