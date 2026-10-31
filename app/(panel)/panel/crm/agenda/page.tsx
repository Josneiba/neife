import type { Metadata } from "next";
import Link from "next/link";
import { requerirAbogado } from "@/lib/guards";
import { finPeriodo, nombreDiaLargo, sumarDias } from "@/lib/crm/fechas";
import { agenda, type ItemAgenda } from "@/lib/crm/servicio";
import { periodoDeParams } from "@/lib/crm/vista";
import { nombreHito } from "@/lib/crm/catalogo";
import { IconoCrm, type NombreIconoCrm } from "@/components/crm/IconosCrm";
import { NavPeriodo, Seccion, Vacio } from "@/components/crm/Piezas";

export const metadata: Metadata = { title: "CRM · Agenda" };
export const dynamic = "force-dynamic";

const ICONO: Record<ItemAgenda["tipo"], NombreIconoCrm> = { hito: "estrella", contacto: "telefono", tarea: "tarea", plan: "objetivo" };
const ROTULO: Record<ItemAgenda["tipo"], string> = { hito: "Hito", contacto: "Contactar", tarea: "Tarea", plan: "Plan" };

function Fila({ i }: { i: ItemAgenda }) {
  const enlace = i.personaId ? `/panel/crm/clientes/${i.personaId}` : null;
  const titulo = i.tipo === "hito" ? `${i.titulo} · ${nombreHito(i.detalle)}` : i.titulo;
  return (
    <li className={`crm-agenda-item ${i.tipo}${i.hecho ? " hecha" : ""}`}>
      <span className="crm-agenda-icono">
        <IconoCrm nombre={ICONO[i.tipo]} tam={18} />
      </span>
      <span className="crm-agenda-texto">
        {enlace ? <Link href={enlace}>{titulo}</Link> : titulo}
        <small>
          {ROTULO[i.tipo]}
          {i.tipo !== "hito" && i.detalle ? ` · ${i.detalle}` : ""}
        </small>
      </span>
    </li>
  );
}

export default async function Agenda({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requerirAbogado();
  const { inicio, hoy } = periodoDeParams({ ...(await searchParams), p: "semana" });
  const fin = finPeriodo("semana", inicio);
  const dias = Array.from({ length: 7 }, (_, k) => sumarDias(inicio, k));
  const [semana, atrasado] = await Promise.all([agenda(u.id, inicio, fin), agenda(u.id, sumarDias(hoy, -90), sumarDias(hoy, -1))]);
  const vencido = atrasado.filter((i) => (i.tipo === "tarea" || i.tipo === "contacto") && !i.hecho);

  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <h1>Agenda</h1>
          <span className="p-sub">Hitos, contactos, tareas y planes</span>
        </div>
      </header>
      <div className="crm-pagina">
        <NavPeriodo base="/panel/crm/agenda" periodo="semana" inicio={inicio} />
        {vencido.length > 0 ? (
          <Seccion titulo={`Atrasado (${vencido.length})`} id="atrasado">
            <ul className="crm-agenda">
              {vencido.map((i, k) => (
                <Fila key={k} i={i} />
              ))}
            </ul>
          </Seccion>
        ) : null}
        {dias.map((dia) => {
          const items = semana.filter((i) => i.fecha === dia);
          return (
            <Seccion key={dia} titulo={`${nombreDiaLargo(dia)}${dia === hoy ? " · hoy" : ""}`}>
              {items.length === 0 ? (
                <p className="crm-vacio">Nada agendado.</p>
              ) : (
                <ul className="crm-agenda">
                  {items.map((i, k) => (
                    <Fila key={k} i={i} />
                  ))}
                </ul>
              )}
            </Seccion>
          );
        })}
        {semana.length === 0 && vencido.length === 0 ? <Vacio>Fija fechas de hito, próximos contactos o tareas y aparecerán aquí.</Vacio> : null}
      </div>
    </>
  );
}
