import { handleClick, readClickForm } from "@/features/payment/click-handler";

/** Click SHOP API — Complete (action=1). Click kabinetida "Complete URL" sifatida: https://<domen>/api/click/complete */
export async function POST(request: Request) {
  return Response.json(await handleClick("complete", await readClickForm(request)));
}
