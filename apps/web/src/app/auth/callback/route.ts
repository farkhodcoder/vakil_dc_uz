import { NextResponse, type NextRequest } from "next/server";
import { afterLoginPath, langFromPath } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";

/** Google (OAuth, PKCE) dan qaytish: kodni sessiyaga almashtiradi va so'ralgan sahifaga yuboradi */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${afterLoginPath(next)}`);
  }
  return NextResponse.redirect(`${origin}/${langFromPath(next)}/kirish?xato=1`);
}
