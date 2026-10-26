"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LockIcon } from "@/components/icons";
import { LogoutButton } from "@/features/auth/session-controls";
import { useRequiredUser } from "@/features/auth/use-session";
import type { Dictionary } from "@/i18n/dictionaries/types";
import { formatSum, HTML_LANG, type Lang } from "@/i18n/locales";
import { getBrowserClient } from "@/lib/supabase/browser";

const STATUS_STYLE = {
  created: "bg-paper text-muted",
  prepared: "bg-warn-50 text-warn",
  paid: "bg-ok-50 text-ok-ink",
  cancelled: "bg-bad-50 text-bad",
} as const;

interface PaymentRow {
  id: string;
  amount_tiyin: number;
  status: keyof typeof STATUS_STYLE;
  created_at: string;
}

/** Kabinet: RLS — foydalanuvchi faqat o'z to'lovlari va mashqlarini ko'radi */
export function CabinetView({ lang, t }: { lang: Lang; t: Dictionary }) {
  const user = useRequiredUser(lang, `/${lang}/kabinet/`);
  const [data, setData] = useState<{ p: { available: number; completed: number }; payments: PaymentRow[] } | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const supabase = getBrowserClient();
    Promise.all([
      supabase.rpc("my_practice"),
      supabase.from("payments").select("id, amount_tiyin, status, created_at").order("created_at", { ascending: false }).limit(50),
    ]).then(([practice, payments]) => {
      if (!active) return;
      setData({
        p: (practice.data ?? { available: 0, completed: 0 }) as { available: number; completed: number },
        payments: (payments.data ?? []) as PaymentRow[],
      });
    });
    return () => {
      active = false;
    };
  }, [user]);

  if (!user || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="size-8 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
      </div>
    );
  }

  const { p, payments } = data;
  const dateFmt = new Intl.DateTimeFormat(HTML_LANG[lang], { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tashkent" });
  const c = t.cabinet;
  const email = user.email ?? "";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand">{c.title}</h1>
          {email && (
            <p className="mt-1 text-muted">
              {c.signedInAs}: <span className="font-semibold text-ink">{email}</span>
            </p>
          )}
        </div>
        <LogoutButton lang={lang} label={t.nav.logout} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-sm font-semibold text-muted">{c.available}</p>
          <p className="mt-1 text-4xl font-extrabold text-brand">{p.available}</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-sm font-semibold text-muted">{c.completed}</p>
          <p className="mt-1 text-4xl font-extrabold text-ok-ink">{p.completed}</p>
        </div>
      </div>

      <Link
        href={`/${lang}/mashq/`}
        className="inline-flex min-h-12 w-fit items-center rounded-full bg-brand px-6 font-bold text-white hover:bg-brand-hover"
      >
        {p.available > 0 ? c.continue : c.buy}
      </Link>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-3 text-lg font-extrabold text-ink">{c.payments}</h2>
        {payments.length === 0 ? (
          <p className="text-muted">{c.noPayments}</p>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="text-muted">
                  <th className="py-2 pr-3 font-semibold">{c.date}</th>
                  <th className="py-2 pr-3 font-semibold">{c.amount}</th>
                  <th className="py-2 font-semibold">{c.status}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((row) => (
                  <tr key={row.id} className="border-t border-line">
                    <td className="py-2.5 pr-3">{dateFmt.format(new Date(row.created_at))}</td>
                    <td className="py-2.5 pr-3 font-semibold tabular-nums">
                      {formatSum(row.amount_tiyin)} {t.pay.currency}
                    </td>
                    <td className="py-2.5">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[row.status]}`}>
                        {c.statuses[row.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="flex items-start gap-2.5 text-sm text-muted">
        <LockIcon className="mt-0.5 size-4 shrink-0" />
        {c.privacy}
      </p>
    </div>
  );
}
