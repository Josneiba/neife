import type { Metadata } from "next";
import Link from "next/link";
import { requerirAbogado } from "@/lib/guards";
import { ETAPAS_CRM, esEtapa, type EtapaCrm } from "@/lib/crm/catalogo";
import { finPeriodo, hoyLocal, inicioSemana } from "@/lib/crm/fechas";
import { conteoPorEtapa, listarGrupos, listarPersonas, solicitudesPorImportar, type FiltroPersonas, type PersonaCrm } from "@/lib/crm/servicio";
import { importarSolicitudesAccion } from "@/lib/acciones/crm";
import { REGIONES } from "@/lib/materias";
import { FilaPersona } from "@/components/crm/FilaPersona";
import { IconoCrm } from "@/components/crm/IconosCrm";
import { Vacio } from "@/components/crm/Piezas";

export const metadata: Metadata = { title: "CRM · Clientes" };
export const dynamic = "force-dynamic";

const FILTROS: Record<string, { clave: NonNullable<FiltroPersonas["filtro"]>; nombre: string }> = {
  referidos: { clave: "referidos", nombre: "Referidos por contactar" },
  sin_contacto: { clave: "sin_contacto", nombre: "Sin movimiento hace 7 días o más" },
  hito_proximo: { clave: "hito_proximo", nombre: "Hito en los próximos 14 días" },
  nuevos_mandantes: { clave: "nuevos_mandantes", nombre: "Con mandato firmado" },
  urgentes: { clave: "urgentes", nombre: "Urgentes" },
  vencidos: { clave: "vencidos", nombre: "Contacto vencido" },
  por_contactar: { clave: "por_contactar", nombre: "Prospectos por contactar" },
  postventa: { clave: "postventa", nombre: "Postventa (30 días sin contacto)" },
};

type Seccion = { titulo: string; personas: PersonaCrm[] };

/** Agrupa a los clientes como la lista de la referencia: lo más cercano a concretarse, primero. */
function agrupar(lista: PersonaCrm[], hoy: string): Seccion[] {
  const ini = inicioSemana(hoy);
  const fin = finPeriodo("semana", ini);
  const reglas: [string, (p: PersonaCrm) => boolean][] = [
    ["Hito esta semana", (p) => p.fechaHito >= ini && p.fechaHito <= fin && ["en_asesoria", "con_hito", "mandato"].includes(p.etapa)],
    ["Hito próximo", (p) => p.fechaHito > fin && p.etapa === "con_hito"],
    ["Con mandato firmado", (p) => p.etapa === "mandato"],
    ["En asesoría", (p) => p.etapa === "en_asesoria" || p.etapa === "con_hito"],
    ["Prospectos y contactados", (p) => p.etapa === "prospecto" || p.etapa === "contactado"],
    ["Derivados y casos resueltos", (p) => p.etapa === "derivado" || p.etapa === "cerrado"],
    ["No continuaron", (p) => p.etapa === "perdido"],
  ];
  const usados = new Set<number>();
  const salida: Seccion[] = [];
  for (const [titulo, regla] of reglas) {
    const personas = lista.filter((p) => !usados.has(p.id) && regla(p));
    personas.forEach((p) => usados.add(p.id));
    if (personas.length) salida.push({ titulo, personas });
  }
  return salida;
}

export default async function Clientes({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requerirAbogado();
  const sp = await searchParams;
  const hoy = hoyLocal();
  const etapa = esEtapa(sp.e) ? (sp.e as EtapaCrm) : undefined;
  const filtro = sp.f && FILTROS[sp.f] ? FILTROS[sp.f] : undefined;
  const grupoId = Number(sp.g) > 0 ? Number(sp.g) : undefined;
  const region = sp.r && (REGIONES as readonly string[]).includes(sp.r) ? sp.r : undefined;
  const q = (sp.q ?? "").slice(0, 80);

  const [lista, porEtapa, grupos, porImportar] = await Promise.all([
    listarPersonas(u.id, { etapa, filtro: filtro?.clave, grupoId, region, q }, hoy),
    conteoPorEtapa(u.id),
    listarGrupos(u.id),
    solicitudesPorImportar(u.id),
  ]);
  const total = Object.values(porEtapa).reduce((a, b) => a + b, 0);
  const grupo = grupos.find((g) => g.id === grupoId);
  const filtrado = !!(etapa || filtro || grupo || region || q);
  const secciones: Seccion[] = filtrado
    ? [{ titulo: [etapa && ETAPAS_CRM.find((e) => e.clave === etapa)?.nombre, filtro?.nombre, grupo?.nombre, region, q && `«${q}»`].filter(Boolean).join(" · "), personas: lista }]
    : agrupar(lista, hoy);

  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <h1>Clientes</h1>
          <span className="p-sub">
            {filtrado ? `${lista.length} de ${total}` : `${total} en total`}
          </span>
        </div>
        <form method="get" className="crm-buscar" role="search">
          <IconoCrm nombre="buscar" tam={18} />
          <input name="q" defaultValue={q} placeholder="Buscar por nombre, correo o teléfono" aria-label="Buscar clientes" className="entrada" maxLength={80} />
          {etapa ? <input type="hidden" name="e" value={etapa} /> : null}
          {filtro ? <input type="hidden" name="f" value={filtro.clave} /> : null}
          {grupoId ? <input type="hidden" name="g" value={grupoId} /> : null}
        </form>
      </header>

      <div className="crm-pagina">
        {porImportar > 0 ? (
          <form action={importarSolicitudesAccion} className="crm-aviso">
            <IconoCrm nombre="info" tam={20} />
            <span>
              Tienes <b>{porImportar}</b> caso{porImportar === 1 ? "" : "s"} en tu panel que aún no están en el CRM.
            </span>
            <button type="submit" className="btn btn-primario btn-chico">
              Importar mis casos
            </button>
          </form>
        ) : null}

        <nav className="crm-chips" aria-label="Filtrar clientes">
          <Link href="/panel/crm/clientes" className={!filtrado ? "activa" : undefined}>
            Todos <span className="n">{total}</span>
          </Link>
          {ETAPAS_CRM.map((e) => (
            <Link key={e.clave} href={`/panel/crm/clientes?e=${e.clave}`} className={etapa === e.clave ? "activa" : undefined}>
              {e.corto} <span className="n">{porEtapa[e.clave]}</span>
            </Link>
          ))}
        </nav>
        <details className="crm-desplegable">
          <summary>
            Grupos y filtros <IconoCrm nombre="flecha-abajo" tam={16} />
          </summary>
          <div className="crm-desplegable-cuerpo">
            <p className="crm-mini-titulo">Grupos</p>
            <p className="crm-chips-linea">
              {grupos.map((g) => (
                <Link key={g.id} href={`/panel/crm/clientes?g=${g.id}`} className={g.id === grupoId ? "activa" : undefined}>
                  {g.nombre} <span className="n">{g.personas}</span>
                </Link>
              ))}
            </p>
            <p className="crm-mini-titulo">Filtros rápidos</p>
            <p className="crm-chips-linea">
              {Object.entries(FILTROS).map(([k, f]) => (
                <Link key={k} href={`/panel/crm/clientes?f=${k}`} className={filtro?.clave === f.clave ? "activa" : undefined}>
                  {f.nombre}
                </Link>
              ))}
            </p>
          </div>
        </details>

        {lista.length === 0 ? (
          <Vacio>
            {filtrado ? "No hay clientes con esos filtros. " : "Aún no tienes clientes en el CRM. "}
            {filtrado ? <Link href="/panel/crm/clientes">Quitar filtros</Link> : "Usa el botón «+» para agregar el primero."}
          </Vacio>
        ) : (
          secciones.map((s) => (
            <section key={s.titulo} className="crm-seccion">
              <header className="crm-seccion-cab">
                <h2>{s.titulo}</h2>
                <span className="crm-chip">{s.personas.length}</span>
              </header>
              <ul className="crm-lista">
                {s.personas.map((p) => (
                  <FilaPersona key={p.id} p={p} hoy={hoy} />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </>
  );
}
