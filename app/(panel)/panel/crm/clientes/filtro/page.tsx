import type { Metadata } from "next";
import { requerirAbogado } from "@/lib/guards";
import { ETAPAS_CRM, ORIGENES_CRM } from "@/lib/crm/catalogo";
import { leerFiltros } from "@/lib/crm/filtros";
import { listarGrupos } from "@/lib/crm/servicio";
import { MATERIAS, REGIONES } from "@/lib/materias";
import { FormFiltro } from "@/components/crm/FormFiltro";

export const metadata: Metadata = { title: "CRM · Filtro" };
export const dynamic = "force-dynamic";

export default async function PaginaFiltro({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requerirAbogado();
  const sp = await searchParams;
  const grupos = await listarGrupos(u.id);
  return (
    <FormFiltro
      inicial={leerFiltros(sp)}
      volver={sp.de === "zonas" ? "/panel/crm/zonas" : "/panel/crm/clientes"}
      regiones={REGIONES.map((r) => ({ clave: r, nombre: r }))}
      opciones={{
        etapas: ETAPAS_CRM.map((e) => ({ clave: e.clave, nombre: e.nombre })),
        materias: MATERIAS.map((m) => ({ clave: m.clave, nombre: m.nombre })),
        origenes: ORIGENES_CRM.map((o) => ({ clave: o.clave, nombre: o.nombre })),
        grupos: grupos.map((g) => ({ clave: String(g.id), nombre: g.nombre })),
      }}
    />
  );
}
