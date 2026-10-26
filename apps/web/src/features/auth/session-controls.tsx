"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Lang } from "@/i18n/locales";
import { getBrowserClient } from "@/lib/supabase/browser";

/** Header: "Kirish" yoki "Kabinet" (brauzer sessiyasi bo'yicha — sahifalar statik qoladi) */
export function AuthLink({ lang, labels }: { lang: Lang; labels: { login: string; cabinet: string } }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = getBrowserClient();
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (signedIn === null) return <span className="inline-block min-h-11 w-20" aria-hidden="true" />;
  return (
    <Link
      href={signedIn ? `/${lang}/kabinet/` : `/${lang}/kirish/`}
      className="inline-flex min-h-11 items-center rounded-full bg-brand px-4 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
    >
      {signedIn ? labels.cabinet : labels.login}
    </Link>
  );
}

export function LogoutButton({ lang, label }: { lang: Lang; label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await getBrowserClient().auth.signOut();
        router.replace(`/${lang}/`);
        router.refresh();
      }}
      className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-5 font-semibold text-brand hover:border-brand"
    >
      {label}
    </button>
  );
}
