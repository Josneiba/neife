import type { Metadata } from "next";
import Link from "next/link";
import { requerirAbogado } from "@/lib/guards";
import { nombreEtapaCrm } from "@/lib/crm/catalogo";
import { listarPersonas } from "@/lib/crm/servicio";
import { nombreMateria } from "@/lib/materias";
import { BarraApp } from "@/components/panel/BarraApp";
import { CampoBusqueda } from "@/components/crm/CampoBusqueda";

export const metadata: Metadata = { title: "CRM · Buscar" };
export const dynamic = "force-dynamic";

export default async function Buscar({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requerirAbogado();
  const q = ((await searchParams).q ?? "").slice(0, 80).trim();
  const lista = q ? await listarPersonas(u.id, { q, limite: 50 }) : [];
  return (
    <>
      <BarraApp titulo="Buscar" volver="/panel/crm/clientes" />
      <CampoBusqueda q={q} hayResultados={lista.length > 0} />
      <ul className="busca-resultados">
        {lista.map((p) => (
          <li key={p.id}>
            <Link href={`/panel/crm/clientes/${p.id}`}>
              <strong>{p.nombre}</strong>
              <small>
                {nombreMateria(p.materia)} · {nombreEtapaCrm(p.etapa)}
                {p.telefono ? ` · ${p.telefono}` : ""}
              </small>
              <small>Código: {p.codigoSeguimiento}</small>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
