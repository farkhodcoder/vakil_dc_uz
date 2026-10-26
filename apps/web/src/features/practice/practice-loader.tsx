"use client";

import dynamic from "next/dynamic";
import type { Dictionary } from "@/i18n/dictionaries/types";
import type { Lang } from "@/i18n/locales";

// Mashq to'liq brauzerda ishlaydi (sessionStorage, kamera, MediaPipe) — serverda render qilinmaydi
const PracticeApp = dynamic(() => import("./practice-app"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[40vh] items-center justify-center">
      <span className="size-8 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
    </div>
  ),
});

export function PracticeLoader(props: { sessionId: string; lang: Lang; t: Dictionary }) {
  return <PracticeApp {...props} />;
}
