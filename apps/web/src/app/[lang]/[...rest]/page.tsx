import { notFound } from "next/navigation";

/** Til ichidagi noma'lum yo'llar — standart inglizcha 404 o'rniga [lang]/not-found.tsx (5 til) */
export default function UnknownPage() {
  notFound();
}
