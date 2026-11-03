import { redirect } from "next/navigation";

/** «Ver todos» de los indicadores ahora lleva a Planificación semanal → Indicadores clave. */
export default async function Indicadores({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const p = sp.p === "mes" || sp.p === "dia" ? sp.p : "semana";
  redirect(`/panel/crm/planificacion?t=indicadores&p=${p}${sp.d ? `&d=${encodeURIComponent(sp.d)}` : ""}`);
}
