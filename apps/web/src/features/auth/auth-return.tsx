"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import type { Lang } from "@/i18n/locales";
import { afterLoginPath } from "@/lib/auth-redirect";
import { getBrowserClient } from "@/lib/supabase/browser";
import { AuthCard } from "./ui";

/**
 * Google'dan qaytish (PKCE). Supabase brauzer mijozi URL'dagi ?code= ni o'zi sessiyaga almashtiradi
 * (detectSessionInUrl); getSession() shu jarayon tugashini kutadi.
 */
export function AuthReturn({ lang, title }: { lang: Lang; title: string }) {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const next = afterLoginPath(params.get("next"));
    getBrowserClient()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) router.replace(next);
        else router.replace(`/${lang}/kirish/?xato=1&next=${encodeURIComponent(next)}`);
      });
  }, [lang, params, router]);

  return (
    <AuthCard title={title}>
      <span className="block size-6 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
    </AuthCard>
  );
}
