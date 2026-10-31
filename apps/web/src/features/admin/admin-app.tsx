"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { LockIcon, ShieldIcon } from "@/components/icons";
import { LogoutButton } from "@/features/auth/session-controls";
import { useRequiredUser } from "@/features/auth/use-session";
import type { Dictionary, RequestStatus, ScopusPackage, ScopusStage, ScopusTarget } from "@/i18n/dictionaries/types";
import { formatSum, type Lang } from "@/i18n/locales";
import { getBrowserClient } from "@/lib/supabase/browser";

// Admin panel ichki vosita — matnlar faqat o'zbekcha (lotin); ariza qiymatlari uz lug'atidan.
const STATUSES: RequestStatus[] = ["new", "in_review", "in_progress", "done", "cancelled"];
const STATUS_STYLE: Record<RequestStatus, string> = {
  new: "bg-brand-50 text-brand",
  in_review: "bg-warn-50 text-warn",
  in_progress: "bg-warn-50 text-warn",
  done: "bg-ok-50 text-ok-ink",
  cancelled: "bg-bad-50 text-bad",
};

interface AdminRequest {
  id: string;
  package: ScopusPackage;
  field: string;
  title: string;
  stage: ScopusStage;
  target: ScopusTarget;
  language: string;
  deadline: string | null;
  contact: string;
  message: string | null;
  status: RequestStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  email: string | null;
}

interface Stats {
  users: number;
  requests: Partial<Record<RequestStatus, number>>;
  paid_count: number;
  paid_tiyin: number;
  practices: number;
  practices_completed: number;
}

const inputBase =
  "min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-base text-ink focus:border-brand focus:outline-none";
const dateFmt = new Intl.DateTimeFormat("uz-Latn-UZ", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tashkent" });

function Spinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <span className="size-8 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
    </div>
  );
}

/** Kontakt: @username → Telegram, raqam → qo'ng'iroq */
function ContactLink({ contact }: { contact: string }) {
  const c = contact.trim();
  const tg = /^@?([A-Za-z0-9_]{5,32})$/.exec(c);
  const digits = c.replace(/[^\d+]/g, "");
  if (c.startsWith("@") && tg) {
    return (
      <a href={`https://t.me/${tg[1]}`} target="_blank" rel="noopener noreferrer" className="font-bold text-brand hover:underline">
        {c}
      </a>
    );
  }
  if (digits.length >= 9) {
    return (
      <a href={`tel:${digits}`} className="font-bold text-brand hover:underline">
        {c}
      </a>
    );
  }
  return <span className="font-bold">{c}</span>;
}

/** 2FA: autentifikator ilovasi (TOTP). Birinchi marta — QR kod bilan ulash, keyin — 6 xonali kod. */
function MfaStep({ onDone }: { onDone: () => void }) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<{ svg: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const mfa = getBrowserClient().auth.mfa;
    (async () => {
      const { data, error: listError } = await mfa.listFactors();
      if (listError) return setError(listError.message);
      const verified = data.totp.find((f) => f.status === "verified");
      if (verified) return setFactorId(verified.id);
      // Oldin tugallanmay qolgan ulanishlarni tozalaymiz
      for (const f of data.all.filter((x) => x.factor_type === "totp" && x.status !== "verified")) {
        await mfa.unenroll({ factorId: f.id });
      }
      const { data: enrolled, error: enrollError } = await mfa.enroll({ factorType: "totp", friendlyName: "vakil admin" });
      if (enrollError) return setError(enrollError.message);
      setFactorId(enrolled.id);
      setQr({ svg: enrolled.totp.qr_code, secret: enrolled.totp.secret });
    })();
  }, []);

  async function verify(e: FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setError(null);
    const { error: verifyError } = await getBrowserClient().auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    setBusy(false);
    if (verifyError) return setError("Kod noto‘g‘ri yoki eskirgan. Ilovadagi yangi kodni kiriting.");
    onDone();
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 px-4 py-12">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-brand text-white">
        <ShieldIcon className="size-6" />
      </span>
      <h1 className="text-2xl font-extrabold text-brand">Ikki bosqichli tasdiqlash</h1>
      {qr ? (
        <>
          <p className="leading-relaxed text-ink/80">
            Admin panel faqat 2FA bilan ochiladi. Telefoningizdagi autentifikator ilovasida (Google Authenticator, Microsoft Authenticator
            va h.k.) QR kodni skanerlang, so‘ng ilova ko‘rsatgan 6 xonali kodni kiriting.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase bergan SVG data-URI */}
          <img src={qr.svg} alt="2FA QR kod" className="size-48 rounded-xl border border-line bg-white p-2" />
          <p className="break-all text-sm text-muted">
            Kalit (qo‘lda kiritish uchun): <span className="font-mono font-semibold text-ink">{qr.secret}</span>
          </p>
        </>
      ) : (
        <p className="leading-relaxed text-ink/80">Autentifikator ilovasidagi 6 xonali kodni kiriting.</p>
      )}
      <form onSubmit={verify} className="flex flex-col gap-3">
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className={`${inputBase} text-center font-mono text-2xl tracking-[0.4em]`}
          aria-label="6 xonali kod"
        />
        {error && <p className="font-semibold text-bad">{error}</p>}
        <button
          type="submit"
          disabled={busy || !factorId || code.length !== 6}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand px-6 font-bold text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {busy ? "Tekshirilmoqda…" : "Tasdiqlash"}
        </button>
      </form>
    </div>
  );
}

function RequestCard({ row, t, onSaved }: { row: AdminRequest; t: Dictionary; onSaved: (row: AdminRequest) => void }) {
  const [status, setStatus] = useState<RequestStatus>(row.status);
  const [note, setNote] = useState(row.admin_note ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const dirty = status !== row.status || note.trim() !== (row.admin_note ?? "");
  const s = t.scopus;

  async function save() {
    setState("saving");
    const { error } = await getBrowserClient().rpc("admin_update_request", { p_id: row.id, p_status: status, p_note: note });
    if (error) return setState("error");
    setState("saved");
    onSaved({ ...row, status, admin_note: note.trim() || null });
  }

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-extrabold leading-snug text-ink">{row.title}</p>
          <p className="text-sm text-muted">
            {dateFmt.format(new Date(row.created_at))} · {row.email ?? "—"}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[row.status]}`}>{s.statuses[row.status]}</span>
      </div>

      <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        <div>
          <dt className="inline text-muted">Paket: </dt>
          <dd className="inline font-semibold">{s.packages[row.package].name}</dd>
        </div>
        <div>
          <dt className="inline text-muted">Soha: </dt>
          <dd className="inline font-semibold">{row.field}</dd>
        </div>
        <div>
          <dt className="inline text-muted">Holati: </dt>
          <dd className="inline font-semibold">{s.stages[row.stage]}</dd>
        </div>
        <div>
          <dt className="inline text-muted">Maqsad: </dt>
          <dd className="inline font-semibold">{s.targets[row.target]}</dd>
        </div>
        <div>
          <dt className="inline text-muted">Til: </dt>
          <dd className="inline font-semibold">{row.language}</dd>
        </div>
        <div>
          <dt className="inline text-muted">Muddat: </dt>
          <dd className="inline font-semibold">{row.deadline ?? "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="inline text-muted">Aloqa: </dt>
          <dd className="inline">
            <ContactLink contact={row.contact} />
          </dd>
        </div>
      </dl>
      {row.message && <p className="whitespace-pre-line rounded-xl bg-paper p-3 text-sm leading-relaxed">{row.message}</p>}

      <div className="grid gap-3 border-t border-line pt-3 sm:grid-cols-[200px_1fr]">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as RequestStatus);
            setState("idle");
          }}
          className={inputBase}
          aria-label="Holat"
        >
          {STATUSES.map((st) => (
            <option key={st} value={st}>
              {s.statuses[st]}
            </option>
          ))}
        </select>
        <textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setState("idle");
          }}
          rows={2}
          maxLength={2000}
          placeholder="Ichki izoh (mijoz ko‘rmaydi)"
          className={`${inputBase} py-2`}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || state === "saving"}
          className="inline-flex min-h-11 items-center rounded-full bg-brand px-5 font-bold text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {state === "saving" ? "Saqlanmoqda…" : "Saqlash"}
        </button>
        {state === "saved" && <span className="font-semibold text-ok-ink">Saqlandi</span>}
        {state === "error" && <span className="font-semibold text-bad">Saqlab bo‘lmadi</span>}
      </div>
    </li>
  );
}

function Dashboard({ lang, t, email }: { lang: Lang; t: Dictionary; email: string }) {
  const [filter, setFilter] = useState<RequestStatus | "all">("new");
  const [rows, setRows] = useState<AdminRequest[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    const supabase = getBrowserClient();
    Promise.all([
      supabase.rpc("admin_list_requests", filter === "all" ? {} : { p_status: filter }),
      supabase.rpc("admin_stats"),
    ]).then(([list, st]) => {
      if (!active) return;
      if (list.error || st.error) {
        setError((list.error ?? st.error)?.message ?? "error");
        return;
      }
      setError(null);
      setRows(list.data as unknown as AdminRequest[]);
      setStats(st.data as unknown as Stats);
    });
    return () => {
      active = false;
    };
  }, [filter, reload]);

  const total = stats ? Object.values(stats.requests).reduce((a, b) => a + (b ?? 0), 0) : 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand">Admin panel</h1>
          <p className="mt-1 text-muted">{email}</p>
        </div>
        <LogoutButton lang={lang} label={t.nav.logout} />
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Foydalanuvchilar", String(stats.users)],
            ["Scopus arizalari", String(total)],
            ["To‘lovlar", `${stats.paid_count} · ${formatSum(stats.paid_tiyin)} so‘m`],
            ["DV mashqlar", `${stats.practices_completed} / ${stats.practices}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-line bg-surface p-4">
              <p className="text-sm font-semibold text-muted">{label}</p>
              <p className="mt-1 text-2xl font-extrabold text-ink">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Holat bo‘yicha">
        {(["all", ...STATUSES] as const).map((st) => {
          const count = st === "all" ? total : (stats?.requests[st] ?? 0);
          const active = filter === st;
          return (
            <button
              key={st}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setFilter(st);
                setRows(null);
              }}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-bold ${
                active ? "bg-brand text-white" : "border border-line bg-surface text-ink hover:border-brand"
              }`}
            >
              {st === "all" ? "Barchasi" : t.scopus.statuses[st]}
              <span className={active ? "text-white/80" : "text-muted"}>{count}</span>
            </button>
          );
        })}
      </div>

      {error && <p className="rounded-xl bg-bad-50 p-3 font-semibold text-bad">Yuklab bo‘lmadi: {error}</p>}
      {!rows && !error && <Spinner />}
      {rows && rows.length === 0 && <p className="text-muted">Bu holatda ariza yo‘q.</p>}
      {rows && rows.length > 0 && (
        <ul className="flex flex-col gap-4">
          {rows.map((row) => (
            <RequestCard
              key={`${row.id}-${row.updated_at}`}
              row={row}
              t={t}
              onSaved={() => setReload((n) => n + 1)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Admin panel: ro'yxatdagi admin + 2FA (aal2). Haqiqiy himoya — bazadagi funksiyalar ichidagi tekshiruv. */
export function AdminApp({ lang, t }: { lang: Lang; t: Dictionary }) {
  const user = useRequiredUser(lang, `/${lang}/admin/`);
  const [status, setStatus] = useState<{ listed: boolean; aal2: boolean } | null>(null);

  const [checkKey, setCheckKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getBrowserClient()
      .rpc("admin_status")
      .then(({ data }) => {
        if (active) setStatus((data as { listed: boolean; aal2: boolean } | null) ?? { listed: false, aal2: false });
      });
    return () => {
      active = false;
    };
  }, [user, checkKey]);

  if (!user || !status) return <Spinner />;

  if (!status.listed) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-start gap-4 px-4 py-16">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-bad-50 text-bad">
          <LockIcon className="size-6" />
        </span>
        <h1 className="text-2xl font-extrabold text-ink">Ruxsat yo‘q</h1>
        <p className="leading-relaxed text-ink/80">
          <span className="font-semibold">{user.email}</span> hisobi admin ro‘yxatida emas.
        </p>
      </div>
    );
  }

  if (!status.aal2) return <MfaStep onDone={() => setCheckKey((n) => n + 1)} />;

  return <Dashboard lang={lang} t={t} email={user.email ?? ""} />;
}
