"use client";

import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Lang } from "@/i18n/locales";
import { getBrowserClient } from "@/lib/supabase/browser";

/**
 * Kirish talab qilinadigan sahifalar uchun (statik sayt — tekshiruv brauzerda).
 * undefined — tekshirilmoqda; User — kirgan. Kirmagan bo'lsa kirish sahifasiga yuboradi.
 * Haqiqiy himoya — bazadagi RLS: kirmagan foydalanuvchi hech qanday ma'lumot olmaydi.
 */
export function useRequiredUser(lang: Lang, nextPath: string): User | undefined {
  const router = useRouter();
  const [user, setUser] = useState<User | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const supabase = getBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (data.user) setUser(data.user);
      else router.replace(`/${lang}/kirish/?next=${encodeURIComponent(nextPath)}`);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace(`/${lang}/`);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [lang, nextPath, router]);

  return user;
}

/** Supabase'da qaysi kirish usullari yoqilgan (ochiq /auth/v1/settings) — sozlama o'zgarsa darhol ko'rinadi */
export function useGoogleEnabled(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;
    let active = true;
    fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
      .then((r) => (r.ok ? r.json() : null))
      .then((s: { external?: Record<string, boolean> } | null) => {
        if (active) setEnabled(Boolean(s?.external?.google));
      })
      .catch(() => {
        if (active) setEnabled(false);
      });
    return () => {
      active = false;
    };
  }, []);
  return enabled;
}
