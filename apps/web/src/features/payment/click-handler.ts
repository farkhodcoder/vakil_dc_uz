import "server-only";
import { createPublicClient } from "@/lib/supabase/public-client";
import { CLICK_INTERNAL_ERROR, isClickResponse, pickClickFields, type ClickForm, type ClickResponse } from "./click";

/** Click so'rovi tanasi (urlencoded yoki multipart). O'qib bo'lmasa — bo'sh (baza -8 qaytaradi). */
export async function readClickForm(request: Request): Promise<ClickForm> {
  try {
    const form = await request.formData();
    return pickClickFields(form.entries());
  } catch {
    return {};
  }
}

/** Imzo, summa, holat — hammasi bazadagi funksiyada (bitta tranzaksiya, qatorni qulflab) */
export async function handleClick(action: "prepare" | "complete", form: ClickForm): Promise<ClickResponse> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc(action === "prepare" ? "click_prepare" : "click_complete", {
      p_form: form,
    });
    if (error || !isClickResponse(data)) {
      console.error(`click ${action}: ${error?.message ?? "noto'g'ri javob"}`);
      return CLICK_INTERNAL_ERROR;
    }
    return data;
  } catch (err) {
    console.error(`click ${action}: ${err instanceof Error ? err.message : String(err)}`);
    return CLICK_INTERNAL_ERROR;
  }
}
