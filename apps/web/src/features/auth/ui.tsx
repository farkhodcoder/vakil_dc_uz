import type { ReactNode } from "react";

/** Kirish/to'lov sahifalari uchun umumiy kartochka */
export function AuthCard({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:py-16">
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand">{title}</h1>
        {lead && <p className="mt-2 leading-relaxed text-ink/75">{lead}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl border border-bad/25 bg-bad-50 px-4 py-3 text-sm font-semibold text-bad">
      {children}
    </p>
  );
}
