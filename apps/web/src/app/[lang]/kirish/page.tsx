import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GoogleButton } from "@/features/auth/google-button";
import { getAuthProviders } from "@/features/auth/providers";
import { AuthCard, FormError } from "@/features/auth/ui";
import { getDictionary } from "@/i18n/get-dictionary";
import { safeNextPath } from "@/lib/auth-redirect";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: `${t.meta.loginTitle} | vakil`, robots: { index: false } };
}

const devLoginEnabled = () => process.env.NODE_ENV === "development" && Boolean(process.env.DEV_LOGIN_EMAIL);

async function LoginContent({ searchParams }: { searchParams: PageProps<"/[lang]/kirish">["searchParams"] }) {
  const [{ lang, t }, sp, providers] = await Promise.all([getDictionary(), searchParams, getAuthProviders()]);
  const next = safeNextPath(typeof sp.next === "string" ? sp.next : null, `/${lang}/mashq`);

  return (
    <AuthCard title={t.auth.title} lead={t.auth.lead}>
      <div className="flex flex-col gap-4">
        {sp.xato !== undefined && <FormError>{t.auth.error}</FormError>}
        {!providers.google && (
          <p className="rounded-xl border border-warn/25 bg-warn-50 px-4 py-3 text-sm font-semibold text-warn">
            {t.auth.notEnabled}
          </p>
        )}
        <GoogleButton next={next} label={t.auth.google} errorText={t.auth.error} disabled={!providers.google} />
        <p className="text-sm text-muted">{t.auth.privacyNote}</p>
        <p className="text-xs leading-relaxed text-muted">
          {t.auth.agree}{" "}
          <Link href={`/${lang}/hujjat/oferta`} className="font-semibold text-brand underline-offset-2 hover:underline">
            {t.footer.offer}
          </Link>
          {" · "}
          <Link href={`/${lang}/hujjat/maxfiylik`} className="font-semibold text-brand underline-offset-2 hover:underline">
            {t.footer.privacy}
          </Link>
        </p>
        {devLoginEnabled() && (
          <form action="/api/dev/login" method="post" className="border-t border-dashed border-line-strong pt-4">
            <input type="hidden" name="next" value={next} />
            <button
              type="submit"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-dashed border-warn px-4 text-sm font-semibold text-warn hover:bg-warn-50"
            >
              {t.auth.devLogin}
            </button>
          </form>
        )}
      </div>
    </AuthCard>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/[lang]/kirish">) {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
