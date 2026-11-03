import { requerirAbogado } from "@/lib/guards";
import { asegurarGrupos } from "@/lib/crm/servicio";

export const dynamic = "force-dynamic";

/** Las secciones y el botón «+» viven ahora en el marco del panel; aquí solo se asegura la sesión. */
export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const u = await requerirAbogado();
  await asegurarGrupos(u.id);
  return <div className="crm crm-cuerpo">{children}</div>;
}
