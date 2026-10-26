// Click SHOP API (docs.click.uz → "SHOP API — Запросы"): Prepare va Complete so'rovlari.
// Click kabinetida:
//   Prepare URL:  https://<ref>.supabase.co/functions/v1/click/prepare
//   Complete URL: https://<ref>.supabase.co/functions/v1/click/complete
// Imzo (md5 + SECRET_KEY Vault'da), summa va holat tekshiruvi bazada: public.click_prepare / click_complete.
// Bu funksiya faqat so'rovni o'qiydi va bazaga uzatadi — maxfiy kalit bu yerda yo'q.
// verify_jwt = false: Click JWT yubormaydi; himoya — imzo.

const FIELDS = new Set([
  "click_trans_id",
  "service_id",
  "click_paydoc_id",
  "merchant_trans_id",
  "merchant_prepare_id",
  "amount",
  "action",
  "error",
  "error_note",
  "sign_time",
  "sign_string",
]);
const MAX_FIELD_LENGTH = 256;
const INTERNAL_ERROR = { error: -8, error_note: "Error in request from click" };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const PUBLISHABLE_KEY = (() => {
  try {
    return JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}").default ?? "";
  } catch {
    return "";
  }
})();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function readForm(req: Request): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  try {
    const form = await req.formData();
    for (const [key, value] of form.entries()) {
      if (typeof value === "string" && value.length <= MAX_FIELD_LENGTH && FIELDS.has(key)) out[key] = value;
    }
  } catch {
    // o'qib bo'lmadi — bo'sh forma, baza -8 qaytaradi
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const step = new URL(req.url).pathname.split("/").filter(Boolean).pop();
  const rpc = step === "prepare" ? "click_prepare" : step === "complete" ? "click_complete" : null;
  if (!rpc) return new Response("Not Found", { status: 404 });

  const form = await readForm(req);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${rpc}`, {
      method: "POST",
      headers: { apikey: PUBLISHABLE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ p_form: form }),
    });
    const data = await res.json();
    if (!res.ok || typeof data?.error !== "number" || typeof data?.error_note !== "string") {
      console.error(`click ${step}: HTTP ${res.status}`);
      return json(INTERNAL_ERROR);
    }
    return json(data);
  } catch (err) {
    console.error(`click ${step}: ${err instanceof Error ? err.message : String(err)}`);
    return json(INTERNAL_ERROR);
  }
});
