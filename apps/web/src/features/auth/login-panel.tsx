"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Dictionary } from "@/i18n/dictionaries/types";
import type { Lang } from "@/i18n/locales";
import { safeNextPath } from "@/lib/auth-redirect";
import { GoogleButton } from "./google-button";
import { AuthCard, FormError } from "./ui";
import { useGoogleEnabled } from "./use-session";

export function LoginPanel({ lang, t }: { lang: Lang; t: Dictionary }) {
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"), `/${lang}/mashq/`);
  const google = useGoogleEnabled();

  return (
    <AuthCard title={t.auth.title} lead={t.auth.lead}>
      <div className="flex flex-col gap-4">
        {params.has("xato") && <FormError>{t.auth.error}</FormError>}
        {google === false && (
          <p className="rounded-xl border border-warn/25 bg-warn-50 px-4 py-3 text-sm font-semibold text-warn">
            {t.auth.notEnabled}
          </p>
        )}
        <GoogleButton next={next} label={t.auth.google} errorText={t.auth.error} disabled={google !== true} />
        <p className="text-sm text-muted">{t.auth.privacyNote}</p>
        <p className="text-xs leading-relaxed text-muted">
          {t.auth.agree}{" "}
          <Link href={`/${lang}/hujjat/oferta/`} className="font-semibold text-brand underline-offset-2 hover:underline">
            {t.footer.offer}
          </Link>
          {" · "}
          <Link href={`/${lang}/hujjat/maxfiylik/`} className="font-semibold text-brand underline-offset-2 hover:underline">
            {t.footer.privacy}
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
