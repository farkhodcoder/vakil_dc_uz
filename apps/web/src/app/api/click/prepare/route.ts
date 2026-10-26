import { handleClick, readClickForm } from "@/features/payment/click-handler";

/** Click SHOP API — Prepare (action=0). Click kabinetida "Prepare URL" sifatida: https://<domen>/api/click/prepare */
export async function POST(request: Request) {
  return Response.json(await handleClick("prepare", await readClickForm(request)));
}
