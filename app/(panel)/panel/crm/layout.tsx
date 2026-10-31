import "../../../crm.css";
import { requerirAbogado } from "@/lib/guards";
import { hoyLocal } from "@/lib/crm/fechas";
import { asegurarGrupos, listarPersonas } from "@/lib/crm/servicio";
import { BarraCrm } from "@/components/crm/BarraCrm";
import { AccionesRapidas } from "@/components/crm/AccionesRapidas";

export const dynamic = "force-dynamic";

/** Marco del CRM: barra de secciones y botón «+» de acciones rápidas en todas sus pantallas. */
export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const u = await requerirAbogado();
  await asegurarGrupos(u.id);
  const personas = await listarPersonas(u.id, { limite: 500 });
  return (
    <div className="crm">
      <BarraCrm />
      <div className="crm-cuerpo">{children}</div>
      <AccionesRapidas personas={personas.map((p) => ({ id: p.id, nombre: p.nombre }))} hoy={hoyLocal()} />
    </div>
  );
}
