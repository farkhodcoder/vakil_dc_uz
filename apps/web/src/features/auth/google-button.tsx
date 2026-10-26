"use client";

import { useState } from "react";
import { callbackUrl } from "@/lib/auth-redirect";
import { getBrowserClient } from "@/lib/supabase/browser";
import { FormError } from "./ui";

/** Google rasmiy "G" belgisi (brending qoidalariga ko'ra tugmada ishlatiladi) */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function GoogleButton({
  next,
  label,
  errorText,
  disabled,
}: {
  next: string;
  label: string;
  errorText: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={async () => {
          setBusy(true);
          setFailed(false);
          const { error } = await getBrowserClient().auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: callbackUrl(window.location.origin, next) },
          });
          // Muvaffaqiyatda brauzer Google'ga o'tadi; xato bo'lsa — shu yerda qolamiz
          if (error) {
            setFailed(true);
            setBusy(false);
          }
        }}
        className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-line-strong bg-surface px-6 font-bold text-ink shadow-sm transition-colors hover:border-brand hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? (
          <span className="size-5 animate-spin rounded-full border-2 border-brand/25 border-t-brand" aria-hidden />
        ) : (
          <GoogleMark />
        )}
        {label}
      </button>
      {failed && <FormError>{errorText}</FormError>}
    </div>
  );
}
