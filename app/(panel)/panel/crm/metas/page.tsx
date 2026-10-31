import type { Metadata } from "next";
import { requerirAbogado } from "@/lib/guards";
import { METRICAS } from "@/lib/crm/catalogo";
import { contarPeriodos, metasVigentes } from "@/lib/crm/servicio";
import { periodoDeParams } from "@/lib/crm/vista";
import { TarjetaIndicador } from "@/components/crm/Indicadores";
import { NavPeriodo, PestanasPeriodo, Seccion } from "@/components/crm/Piezas";

export const metadata: Metadata = { title: "CRM · Indicadores" };
export const dynamic = "force-dynamic";

export default async function Indicadores({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requerirAbogado();
  const { periodo, inicio } = periodoDeParams(await searchParams);
  const [real, meta] = await Promise.all([contarPeriodos(u.id, periodo, [inicio]), metasVigentes(u.id, periodo, inicio)]);
  const lista = METRICAS.filter((m) => m.periodos.includes(periodo));
  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <h1>Indicadores clave</h1>
          <span className="p-sub">Toca uno para editar su meta</span>
        </div>
      </header>
      <div className="crm-pagina">
        <PestanasPeriodo base="/panel/crm/metas" periodo={periodo} inicio={inicio} />
        <NavPeriodo base="/panel/crm/metas" periodo={periodo} inicio={inicio} />
        <Seccion titulo={periodo === "dia" ? "Metas del día" : periodo === "semana" ? "Metas de la semana" : "Metas del mes"}>
          <div className="crm-kpis">
            {lista.map((m) => (
              <TarjetaIndicador key={m.clave} clave={m.clave} real={real[inicio][m.clave]} meta={meta[m.clave]} href={`/panel/crm/metas/${m.clave}?p=${periodo}&d=${inicio}`} />
            ))}
          </div>
        </Seccion>
      </div>
    </>
  );
}
