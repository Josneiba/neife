import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirAbogado } from "@/lib/guards";
import { SEGMENTOS_PLAN, esSegmento, nombreEtapaCrm, nombreHito } from "@/lib/crm/catalogo";
import { fechaDMA, haceCuanto, hoyLocal, nombreDiaLargo, sumarDias } from "@/lib/crm/fechas";
import { personasDeSegmento } from "@/lib/crm/servicio-planificacion";
import { periodoDeParams } from "@/lib/crm/vista";
import { planRapidoAccion } from "@/lib/acciones/crm2";
import { IconoCrm } from "@/components/crm/IconosCrm";
import { NavPeriodo, Vacio } from "@/components/crm/Piezas";
import { BarraApp } from "@/components/panel/BarraApp";

export const metadata: Metadata = { title: "Planificación · Clientes" };
export const dynamic = "force-dynamic";

const FUENTE_DE: Record<string, string> = {
  nuevos_mandantes: "asesorias",
  con_hito: "asesorias",
  asesoria_reciente: "asesorias",
  en_asesoria: "asesorias",
  interesados: "interesados",
  derivados: "red",
  antiguos: "antiguos",
  referentes: "red",
};

export default async function Segmento({ params, searchParams }: { params: Promise<{ segmento: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requerirAbogado();
  const { segmento } = await params;
  if (!esSegmento(segmento)) notFound();
  const def = SEGMENTOS_PLAN.find((s) => s.clave === segmento)!;
  const { inicio, hoy } = periodoDeParams({ ...(await searchParams), p: "semana" }, "semana", hoyLocal());
  const lista = await personasDeSegmento(u.id, segmento, inicio, hoy);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(inicio, i));
  const base = `/panel/crm/planificacion/personas/${segmento}`;

  return (
    <>
      <BarraApp titulo={def.titulo} volver={`/panel/crm/planificacion?t=personas&d=${inicio}`} />
      <div className="crm-pagina">
        <NavPeriodo base={base} periodo="semana" inicio={inicio} />
        {lista.length === 0 ? (
          <Vacio>
            No hay clientes en este grupo. <Link href="/panel/crm/clientes">Ver todos los clientes</Link>.
          </Vacio>
        ) : (
          <ul className="crm-lista">
            {lista.map(({ p, conPlan }) => (
              <li key={p.id} className="crm-persona crm-persona-plan">
                <Link href={`/panel/crm/clientes/${p.id}`} className="crm-persona-enlace">
                  <span className="crm-persona-cuerpo">
                    <span className="crm-persona-nombre">{p.nombre}</span>
                    <span className="crm-persona-linea">
                      {nombreEtapaCrm(p.etapa)}
                      {p.fechaHito ? ` · ${nombreHito(p.tipoHito)} ${fechaDMA(p.fechaHito)}` : ""}
                      {p.ultimaAsesoria ? ` · última asesoría ${haceCuanto(p.ultimaAsesoria, hoy)}` : ""}
                    </span>
                  </span>
                </Link>
                {conPlan ? (
                  <span className="crm-sello">
                    <IconoCrm nombre="check" tam={14} /> Con plan
                  </span>
                ) : (
                  <form action={planRapidoAccion} className="crm-form-linea">
                    <input type="hidden" name="persona_id" value={p.id} />
                    <input type="hidden" name="fuente" value={FUENTE_DE[segmento]} />
                    <select name="fecha" className="entrada" defaultValue={dias.includes(hoy) ? hoy : dias[0]} aria-label={`Día para contactar a ${p.nombre}`}>
                      {dias.map((d) => (
                        <option key={d} value={d}>
                          {nombreDiaLargo(d)}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="btn btn-secundario btn-chico">
                      Planificar
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
