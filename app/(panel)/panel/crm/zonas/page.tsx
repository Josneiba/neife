import type { Metadata } from "next";
import Link from "next/link";
import { requerirAbogado } from "@/lib/guards";
import { ETAPAS_CRM } from "@/lib/crm/catalogo";
import { zonas } from "@/lib/crm/servicio";
import { Vacio } from "@/components/crm/Piezas";

export const metadata: Metadata = { title: "CRM · Zonas" };
export const dynamic = "force-dynamic";

export default async function Zonas() {
  const u = await requerirAbogado();
  const filas = await zonas(u.id);
  const porRegion = new Map<string, typeof filas>();
  for (const f of filas) porRegion.set(f.region || "Sin región", [...(porRegion.get(f.region || "Sin región") ?? []), f]);
  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <h1>Zonas</h1>
          <span className="p-sub">Dónde están tus clientes</span>
        </div>
      </header>
      <div className="crm-pagina">
        {filas.length === 0 ? (
          <Vacio>Aún no hay clientes con región o comuna. Agrégalas en la ficha de cada cliente.</Vacio>
        ) : (
          [...porRegion.entries()].map(([region, comunas]) => {
            const abiertos = comunas.reduce((a, c) => a + c.abiertos, 0);
            const total = comunas.reduce((a, c) => a + c.total, 0);
            return (
              <section key={region} className="crm-seccion">
                <header className="crm-seccion-cab">
                  <h2>{region}</h2>
                  <Link href={`/panel/crm/clientes?r=${encodeURIComponent(region)}`}>
                    {abiertos} abiertos · {total} en total
                  </Link>
                </header>
                <ul className="crm-zonas">
                  {comunas.map((c) => (
                    <li key={c.comuna || "-"}>
                      <strong>{c.comuna || "Sin comuna"}</strong>
                      <span className="crm-zona-barra" aria-hidden="true">
                        {ETAPAS_CRM.filter((e) => c.porEtapa[e.clave]).map((e) => (
                          <i key={e.clave} className={`e-${e.clave}`} style={{ flex: c.porEtapa[e.clave] }} />
                        ))}
                      </span>
                      <small>{c.abiertos} abiertos · {c.total} en total</small>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </>
  );
}
