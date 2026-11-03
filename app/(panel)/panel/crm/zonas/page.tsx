import type { Metadata } from "next";
import Link from "next/link";
import { requerirAbogado } from "@/lib/guards";
import { ETAPAS_CRM, ORIGENES_CRM, nombreEtapaCrm } from "@/lib/crm/catalogo";
import { aplicarFiltros, hayFiltros, leerFiltros } from "@/lib/crm/filtros";
import { listarGrupos, listarPersonas, zonas } from "@/lib/crm/servicio";
import { listarNotasZona } from "@/lib/crm/servicio-planificacion";
import { eliminarNotaZonaAccion } from "@/lib/acciones/crm2";
import { MATERIAS, nombreMateria } from "@/lib/materias";
import { MapaClientes, type PuntoMapa } from "@/components/crm/MapaClientes";
import { FormNotaZona } from "@/components/crm/FormNotaZona";
import { IconoCrm } from "@/components/crm/IconosCrm";
import { VistasGuardadas } from "@/components/crm/VistasGuardadas";
import { OpcionMenu } from "@/components/panel/BarraApp";
import { Vacio } from "@/components/crm/Piezas";

export const metadata: Metadata = { title: "CRM · Mapa" };
export const dynamic = "force-dynamic";

export default async function Zonas({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requerirAbogado();
  const sp = await searchParams;
  const foco = Number(sp.p) > 0 ? Number(sp.p) : undefined;
  const f = leerFiltros(sp);
  const [filas, base, notas, grupos] = await Promise.all([zonas(u.id), listarPersonas(u.id, { q: f.q, limite: 1000 }), listarNotasZona(u.id), listarGrupos(u.id)]);
  let personas = base;
  if (f.g.length) {
    const ids = new Set<number>();
    for (const g of f.g) (await listarPersonas(u.id, { grupoId: g, limite: 1000 })).forEach((p) => ids.add(p.id));
    personas = base.filter((p) => ids.has(p.id));
  }
  personas = aplicarFiltros(personas, f);
  const conPunto = personas.filter((p) => p.lat != null && p.lng != null);
  const sinPunto = personas.filter((p) => p.lat == null || p.lng == null);
  const puntos: PuntoMapa[] = conPunto.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    etapa: p.etapa,
    etapaNombre: nombreEtapaCrm(p.etapa),
    materia: nombreMateria(p.materia),
    comuna: p.comuna,
    lat: p.lat as number,
    lng: p.lng as number,
  }));
  const porRegion = new Map<string, typeof filas>();
  for (const z of filas) porRegion.set(z.region || "Sin región", [...(porRegion.get(z.region || "Sin región") ?? []), z]);

  return (
    <MapaClientes
      puntos={puntos}
      focoId={foco}
      etapas={ETAPAS_CRM.map((e) => ({ clave: e.clave, nombre: e.nombre }))}
      opciones={{
        etapas: ETAPAS_CRM.map((e) => ({ clave: e.clave, nombre: e.nombre })),
        materias: MATERIAS.map((m) => ({ clave: m.clave, nombre: m.nombre })),
        origenes: ORIGENES_CRM.map((o) => ({ clave: o.clave, nombre: o.nombre })),
        grupos: grupos.map((g) => ({ clave: String(g.id), nombre: g.nombre })),
      }}
      abrir={sp.abrir === "notas" ? "notas" : undefined}
      filtrado={hayFiltros(f)}
      vistas={
        <>
          <OpcionMenu href="/panel/crm/zonas" activa={!hayFiltros(f)}>Todos</OpcionMenu>
          {ETAPAS_CRM.map((e) => (
            <OpcionMenu key={e.clave} href={`/panel/crm/zonas?e=${e.clave}`} activa={f.e.length === 1 && f.e[0] === e.clave}>
              {e.nombre}
            </OpcionMenu>
          ))}
          <VistasGuardadas base="/panel/crm/zonas" />
        </>
      }
      notas={
        <>
          {notas.length === 0 ? (
            <Vacio>Sin notas.</Vacio>
          ) : (
            <ul className="crm-notas-zona">
              {notas.map((n) => (
                <li key={n.id}>
                  <div>
                    <strong>{n.comuna}</strong>
                    {n.region ? <small> · {n.region}</small> : null}
                    <p>{n.texto}</p>
                  </div>
                  <form action={eliminarNotaZonaAccion}>
                    <input type="hidden" name="id" value={n.id} />
                    <button type="submit" className="crm-icono-boton" aria-label={`Eliminar la nota de ${n.comuna}`}>
                      <IconoCrm nombre="papelera" tam={16} />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <FormNotaZona />
        </>
      }
      sinUbicacion={
        sinPunto.length === 0 ? (
          <Vacio>Todos tienen ubicación.</Vacio>
        ) : (
          <ul className="lista-enlaces">
            {sinPunto.slice(0, 100).map((p) => (
              <li key={p.id}>
                <Link href={`/panel/crm/clientes/${p.id}`}>
                  {p.nombre} <small>{[p.comuna, p.region].filter(Boolean).join(", ") || "sin zona"}</small>
                </Link>
              </li>
            ))}
          </ul>
        )
      }
      porComuna={
        filas.length === 0 ? (
          <Vacio>Aún no hay clientes con región o comuna.</Vacio>
        ) : (
          <>
            {[...porRegion.entries()].map(([region, comunas]) => (
              <div key={region}>
                <h3 className="crm-mini-titulo">
                  <Link href={`/panel/crm/clientes?r=${encodeURIComponent(region)}`}>{region}</Link>
                </h3>
                <ul className="crm-zonas">
                  {comunas.map((c) => (
                    <li key={c.comuna || "-"}>
                      <strong>{c.comuna || "Sin comuna"}</strong>
                      <span className="crm-zona-barra" aria-hidden="true">
                        {ETAPAS_CRM.filter((e) => c.porEtapa[e.clave]).map((e) => (
                          <i key={e.clave} className={`e-${e.clave}`} style={{ flex: c.porEtapa[e.clave] }} />
                        ))}
                      </span>
                      <small>
                        {c.abiertos} abiertos · {c.total} en total
                      </small>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        )
      }
    />
  );
}
