import type { Metadata } from "next";
import Link from "next/link";
import { requerirAbogado } from "@/lib/guards";
import { fechaDMA, hoyLocal } from "@/lib/crm/fechas";
import { listarPersonas, listarTareas } from "@/lib/crm/servicio";
import { alternarTareaAccion, eliminarTareaAccion } from "@/lib/acciones/crm";
import { FormTarea } from "@/components/crm/AccionesRapidas";
import { IconoCrm } from "@/components/crm/IconosCrm";
import { Seccion, Vacio } from "@/components/crm/Piezas";
import { BarraApp, IconoBarra } from "@/components/panel/BarraApp";

export const metadata: Metadata = { title: "CRM · Tareas" };
export const dynamic = "force-dynamic";

export default async function Tareas({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requerirAbogado();
  const sp = await searchParams;
  const hoy = hoyLocal();
  const verHechas = sp.hechas === "1";
  const [tareas, personas] = await Promise.all([listarTareas(u.id, { incluirHechas: verHechas }), listarPersonas(u.id, { limite: 500 })]);

  return (
    <>
      <BarraApp titulo="Tareas" subtitulo={`${tareas.filter((t) => !t.hecha).length}`} acciones={<IconoBarra href={verHechas ? "/panel/crm/tareas" : "/panel/crm/tareas?hechas=1"} icono={verHechas ? "check" : "cuadro-check"} etiqueta={verHechas ? "Ocultar hechas" : "Mostrar hechas"} />} />
      <div className="crm-pagina">
        <Seccion titulo="Nueva tarea" id="nueva">
          <FormTarea personas={personas.map((p) => ({ id: p.id, nombre: p.nombre }))} hoy={hoy} />
        </Seccion>
        <Seccion titulo="Lista" id="lista">
          {tareas.length === 0 ? (
            <Vacio>No tienes tareas pendientes. 🎉</Vacio>
          ) : (
            <ul className="crm-tareas">
              {tareas.map((t) => (
                <li key={t.id} className={t.hecha ? "hecha" : undefined}>
                  <form action={alternarTareaAccion}>
                    <input type="hidden" name="id" value={t.id} />
                    <button type="submit" className="crm-casilla" aria-pressed={t.hecha} aria-label={t.hecha ? "Marcar como pendiente" : "Marcar como hecha"}>
                      {t.hecha ? <IconoCrm nombre="check" tam={16} /> : null}
                    </button>
                  </form>
                  <span>
                    {t.texto}
                    {t.persona ? (
                      <small>
                        {" "}
                        · <Link href={`/panel/crm/clientes/${t.personaId}`}>{t.persona}</Link>
                      </small>
                    ) : null}
                  </span>
                  {t.vence ? <small className={!t.hecha && t.vence < hoy ? "venc" : undefined}>{fechaDMA(t.vence)}</small> : null}
                  <form action={eliminarTareaAccion}>
                    <input type="hidden" name="id" value={t.id} />
                    <button type="submit" className="crm-icono-boton" aria-label="Eliminar tarea">
                      <IconoCrm nombre="papelera" tam={16} />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Seccion>
      </div>
    </>
  );
}
