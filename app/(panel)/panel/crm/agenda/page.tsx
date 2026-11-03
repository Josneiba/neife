import type { Metadata } from "next";
import { requerirAbogado } from "@/lib/guards";
import { ahoraLocal, esFecha, finPeriodo, inicioSemana, sumarDias } from "@/lib/crm/fechas";
import { agenda, listarPersonas, listarTareas } from "@/lib/crm/servicio";
import { listarCitas } from "@/lib/crm/servicio-citas";
import { Calendario } from "@/components/crm/Calendario";

export const metadata: Metadata = { title: "Agenda" };
export const dynamic = "force-dynamic";

export default async function Agenda({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requerirAbogado();
  const sp = await searchParams;
  const ahora = ahoraLocal();
  const fecha = esFecha(sp.d) ? sp.d : ahora.fecha;
  const vista = sp.v === "semana" || sp.v === "citas" || sp.v === "tareas" ? sp.v : "dia";
  const lunes = inicioSemana(fecha);
  const domingo = finPeriodo("semana", lunes);
  const [citas, items, personas, tareas] = await Promise.all([
    listarCitas(u.id, vista === "citas" ? ahora.fecha : lunes, vista === "citas" ? sumarDias(ahora.fecha, 60) : domingo),
    agenda(u.id, lunes, domingo),
    listarPersonas(u.id, { limite: 500 }),
    listarTareas(u.id, { incluirHechas: true }),
  ]);

  return (
    <>
      <Calendario
          fecha={fecha}
          hoy={ahora.fecha}
          ahora={ahora}
          vista={vista}
          citas={citas}
          items={items.map((i) => ({ fecha: i.fecha, tipo: i.tipo, titulo: i.titulo, detalle: i.detalle, personaId: i.personaId, hecho: i.hecho }))}
          personas={personas.map((p) => ({ id: p.id, nombre: p.nombre }))}
        tareas={tareas.map((t) => ({ id: t.id, texto: t.texto, vence: t.vence, hecha: t.hecha, personaId: t.personaId }))}
      />
    </>
  );
}
