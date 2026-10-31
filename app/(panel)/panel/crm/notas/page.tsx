import type { Metadata } from "next";
import Link from "next/link";
import { requerirAbogado } from "@/lib/guards";
import { fechaDMA } from "@/lib/crm/fechas";
import { listarNotas } from "@/lib/crm/servicio";
import { Vacio } from "@/components/crm/Piezas";

export const metadata: Metadata = { title: "CRM · Notas rápidas" };
export const dynamic = "force-dynamic";

export default async function Notas() {
  const u = await requerirAbogado();
  const notas = await listarNotas(u.id);
  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <h1>Notas rápidas</h1>
          <span className="p-sub">Lo último que anotaste de tus clientes</span>
        </div>
      </header>
      <div className="crm-pagina">
        {notas.length === 0 ? (
          <Vacio>Aún no hay notas. En la ficha de un cliente, elige «Nota» en «Registrar».</Vacio>
        ) : (
          <ol className="crm-historial">
            {notas.map((n) => (
              <li key={n.id}>
                <div className="crm-historial-cab">
                  <strong>
                    <Link href={`/panel/crm/clientes/${n.personaId}`}>{n.persona}</Link>
                  </strong>
                  <span>{fechaDMA(n.fecha)}</span>
                </div>
                <p>{n.nota || "—"}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
