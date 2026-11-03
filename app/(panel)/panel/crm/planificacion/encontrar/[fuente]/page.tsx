import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirAbogado } from "@/lib/guards";
import { FUENTES_PLAN, esFuente, tipoCita } from "@/lib/crm/catalogo";
import { fechaDMA, finPeriodo, hoyLocal, nombreDiaLargo, sumarDias } from "@/lib/crm/fechas";
import { listarPersonas, listarPlanes } from "@/lib/crm/servicio";
import { listarCitas } from "@/lib/crm/servicio-citas";
import { periodoDeParams } from "@/lib/crm/vista";
import { alternarPlanAccion, eliminarPlanAccion } from "@/lib/acciones/crm";
import { FormPlan } from "@/components/crm/FormPlan";
import { IconoCrm } from "@/components/crm/IconosCrm";
import { NavPeriodo, Seccion, Vacio } from "@/components/crm/Piezas";
import { BarraApp } from "@/components/panel/BarraApp";

export const metadata: Metadata = { title: "Planificación · Encontrar clientes" };
export const dynamic = "force-dynamic";

export default async function PlanesFuente({ params, searchParams }: { params: Promise<{ fuente: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requerirAbogado();
  const { fuente } = await params;
  if (!esFuente(fuente)) notFound();
  const def = FUENTES_PLAN.find((f) => f.clave === fuente)!;
  const { inicio, hoy } = periodoDeParams({ ...(await searchParams), p: "semana" }, "semana", hoyLocal());
  const fin = finPeriodo("semana", inicio);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(inicio, i));
  const [planes, personas, citas] = await Promise.all([
    listarPlanes(u.id, inicio, fin),
    listarPersonas(u.id, { limite: 500 }),
    fuente === "asesorias" ? listarCitas(u.id, inicio, fin) : Promise.resolve([]),
  ]);
  const delaFuente = planes.filter((p) => p.fuente === fuente);
  const asesorias = citas.filter((c) => c.tipo === "asesoria" && c.estado === "pendiente");

  return (
    <>
      <BarraApp titulo={def.nombre} volver={`/panel/crm/planificacion?t=encontrar&d=${inicio}`} />
      <div className="crm-pagina">
        <NavPeriodo base={`/panel/crm/planificacion/encontrar/${fuente}`} periodo="semana" inicio={inicio} />

        {fuente === "asesorias" ? (
          <Seccion titulo="Asesorías agendadas" id="asesorias">
            {asesorias.length === 0 ? (
              <Vacio>
                No hay asesorías agendadas esta semana. <Link href={`/panel/crm/agenda?d=${inicio}`}>Agenda una en la agenda</Link>.
              </Vacio>
            ) : (
              <ul className="crm-agenda">
                {asesorias.map((c) => (
                  <li key={c.id} className="crm-agenda-item cita">
                    <span className="crm-agenda-hora">{fechaDMA(c.fecha).slice(0, 5)}</span>
                    <span className="crm-agenda-texto">
                      <Link href={`/panel/crm/agenda?d=${c.fecha}`}>{c.persona || c.titulo || tipoCita(c.tipo).nombre}</Link>
                      <small>
                        {c.horaIni}–{c.horaFin}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Seccion>
        ) : null}

        {dias.map((dia) => {
          const delDia = delaFuente.filter((p) => p.fecha === dia);
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
                      <span>{p.personaId ? <Link href={`/panel/crm/clientes/${p.personaId}`}>{p.persona}</Link> : p.texto}</span>
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
