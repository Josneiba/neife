import type { Metadata } from "next";
import Link from "next/link";
import { requerirAbogado } from "@/lib/guards";
import { FUENTES_PLAN, esFuente } from "@/lib/crm/catalogo";
import { fechaDMA, finPeriodo, nombreDiaLargo, sumarDias } from "@/lib/crm/fechas";
import { listarPersonas, listarPlanes } from "@/lib/crm/servicio";
import { periodoDeParams } from "@/lib/crm/vista";
import { alternarPlanAccion, eliminarPlanAccion } from "@/lib/acciones/crm";
import { FormPlan } from "@/components/crm/FormPlan";
import { IconoCrm } from "@/components/crm/IconosCrm";
import { NavPeriodo, Seccion } from "@/components/crm/Piezas";

export const metadata: Metadata = { title: "CRM · Planificación semanal" };
export const dynamic = "force-dynamic";

export default async function Planificacion({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requerirAbogado();
  const sp = await searchParams;
  const { inicio, hoy } = periodoDeParams({ ...sp, p: "semana" });
  const fin = finPeriodo("semana", inicio);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(inicio, i));
  const fuente = esFuente(sp.fuente) ? sp.fuente : undefined;
  const [planes, personas] = await Promise.all([listarPlanes(u.id, inicio, fin), listarPersonas(u.id, { limite: 500 })]);
  const visibles = fuente ? planes.filter((p) => p.fuente === fuente) : planes;

  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <Link href="/panel/crm" className="crm-volver" aria-label="Volver al inicio">
            <IconoCrm nombre="flecha-izq" tam={22} />
          </Link>
          <h1>Planificación semanal</h1>
          <span className="p-sub">Dónde y a quién buscarás cada día</span>
        </div>
      </header>
      <div className="crm-pagina">
        <NavPeriodo base="/panel/crm/planificacion" periodo="semana" inicio={inicio} extra={fuente ? `fuente=${fuente}` : undefined} />
        <nav className="crm-chips" aria-label="Filtrar por fuente">
          <Link href={`/panel/crm/planificacion?d=${inicio}`} className={!fuente ? "activa" : undefined}>
            Todas <span className="n">{planes.length}</span>
          </Link>
          {FUENTES_PLAN.map((f) => (
            <Link key={f.clave} href={`/panel/crm/planificacion?d=${inicio}&fuente=${f.clave}`} className={fuente === f.clave ? "activa" : undefined}>
              {f.nombre} <span className="n">{planes.filter((p) => p.fuente === f.clave).length}</span>
            </Link>
          ))}
        </nav>

        {dias.map((dia) => {
          const delDia = visibles.filter((p) => p.fecha === dia);
          return (
            <Seccion key={dia} titulo={`${nombreDiaLargo(dia)}${dia === hoy ? " · hoy" : ""}`}>
              {delDia.length === 0 ? (
                <p className="crm-vacio">Sin planes.</p>
              ) : (
                <ul className="crm-tareas">
                  {delDia.map((p) => (
                    <li key={p.id} className={p.hecho ? "hecha" : undefined}>
                      <form action={alternarPlanAccion}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="crm-casilla" aria-pressed={p.hecho} aria-label={p.hecho ? "Marcar como pendiente" : "Marcar como hecho"}>
                          {p.hecho ? <IconoCrm nombre="check" tam={16} /> : null}
                        </button>
                      </form>
                      <span>
                        {p.personaId ? <Link href={`/panel/crm/clientes/${p.personaId}`}>{p.persona}</Link> : p.texto}
                        <small className="crm-chip">{FUENTES_PLAN.find((f) => f.clave === p.fuente)?.nombre}</small>
                      </span>
                      <form action={eliminarPlanAccion}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="crm-icono-boton" aria-label={`Quitar el plan del ${fechaDMA(p.fecha)}`}>
                          <IconoCrm nombre="papelera" tam={16} />
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </Seccion>
          );
        })}

        <Seccion titulo="Agregar un plan" id="nuevo-plan">
          <FormPlan dias={dias} personas={personas.map((p) => ({ id: p.id, nombre: p.nombre }))} fuente={fuente} />
        </Seccion>
      </div>
    </>
  );
}
