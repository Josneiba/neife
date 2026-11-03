import type { Metadata } from "next";
import Link from "next/link";
import { requerirAbogado } from "@/lib/guards";
import { ETAPAS_CRM, ORIGENES_CRM } from "@/lib/crm/catalogo";
import { aplicarFiltros, hayFiltros, leerFiltros } from "@/lib/crm/filtros";
import { finPeriodo, hoyLocal, inicioSemana } from "@/lib/crm/fechas";
import { listarGrupos, listarPersonas, solicitudesPorImportar, type FiltroPersonas, type PersonaCrm } from "@/lib/crm/servicio";
import { importarSolicitudesAccion } from "@/lib/acciones/crm";
import { BarraApp, IconoBarra, OpcionMenu } from "@/components/panel/BarraApp";
import { ChipsFiltro } from "@/components/crm/ChipsFiltro";
import { BotonGuardarFiltro, VistasGuardadas } from "@/components/crm/VistasGuardadas";
import { Popover } from "@/components/crm/Popover";
import { MATERIAS } from "@/lib/materias";
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
  sin_seguimiento: { clave: "sin_seguimiento", nombre: "Sin seguimiento" },
  mandatos_por_firmar: { clave: "mandatos_por_firmar", nombre: "Mandatos por firmar" },
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
  const f = leerFiltros(sp);
  const rapido = FILTROS[f.f];

  const [base, grupos, porImportar] = await Promise.all([
    listarPersonas(u.id, { filtro: rapido?.clave, q: f.q, limite: 1000 }, hoy),
    listarGrupos(u.id),
    solicitudesPorImportar(u.id),
  ]);
  // Varios grupos a la vez: se junta cada grupo (la lista base ya respeta el resto).
  let lista = base;
  if (f.g.length) {
    const ids = new Set<number>();
    for (const g of f.g) (await listarPersonas(u.id, { grupoId: g, limite: 1000 }, hoy)).forEach((p) => ids.add(p.id));
    lista = base.filter((p) => ids.has(p.id));
  }
  lista = aplicarFiltros(lista, f);
  const filtrado = hayFiltros(f);
  const secciones: Seccion[] = f.s === "estado" && !filtrado ? agrupar(lista, hoy) : [{ titulo: "", personas: lista }];
  const conTel = lista.filter((p) => p.telefono.replace(/[^\d+]/g, "").length >= 8);
  const conCorreo = lista.filter((p) => p.email);

  return (
    <>
      <BarraApp
        titulo="Clientes"
        subtitulo={filtrado ? "Filtrado" : undefined}
        vistas={
          <>
            <OpcionMenu href="/panel/crm/clientes" activa={!filtrado}>Todos</OpcionMenu>
            {ETAPAS_CRM.map((e) => (
              <OpcionMenu key={e.clave} href={`/panel/crm/clientes?e=${e.clave}`} activa={f.e.length === 1 && f.e[0] === e.clave && !f.f}>
                {e.nombre}
              </OpcionMenu>
            ))}
            <p className="pop-sep">Filtros rápidos</p>
            {Object.entries(FILTROS).map(([k, x]) => (
              <OpcionMenu key={k} href={`/panel/crm/clientes?f=${k}`} activa={f.f === k}>
                {x.nombre}
              </OpcionMenu>
            ))}
            <VistasGuardadas base="/panel/crm/clientes" />
          </>
        }
        acciones={
          <>
            <BotonGuardarFiltro />
            <IconoBarra href="/panel/crm/buscar" icono="buscar" etiqueta="Buscar" />
            <Popover etiqueta="Más opciones" icono="puntos">
              {conTel.length ? (
                <a className="pop-op" role="menuitem" href={`sms:${conTel.map((p) => p.telefono.replace(/[^\d+]/g, "")).join(",")}`}>
                  <IconoCrm nombre="mensaje" tam={20} />
                  <span>SMS a los {conTel.length} de la lista</span>
                </a>
              ) : null}
              {conCorreo.length ? (
                <a className="pop-op" role="menuitem" href={`mailto:?bcc=${conCorreo.map((p) => p.email).join(",")}`}>
                  <IconoCrm nombre="correo" tam={20} />
                  <span>Correo a los {conCorreo.length} de la lista</span>
                </a>
              ) : null}
              {porImportar > 0 ? (
                <form action={importarSolicitudesAccion}>
                  <button type="submit" className="pop-op">
                    <IconoCrm nombre="descargar" tam={20} />
                    <span>Importar mis {porImportar} casos</span>
                  </button>
                </form>
              ) : null}
              <OpcionMenu href="/panel/crm/informes" icono="informe">Informes de clientes</OpcionMenu>
            </Popover>
          </>
        }
      />
      <ChipsFiltro
        base="/panel/crm/clientes"
        opciones={{
          etapas: ETAPAS_CRM.map((e) => ({ clave: e.clave, nombre: e.nombre })),
          materias: MATERIAS.map((m) => ({ clave: m.clave, nombre: m.nombre })),
          origenes: ORIGENES_CRM.map((o) => ({ clave: o.clave, nombre: o.nombre })),
          grupos: grupos.map((g) => ({ clave: String(g.id), nombre: g.nombre })),
        }}
      />

      <div className="crm-pagina plana">
        {lista.length === 0 ? (
          <Vacio>
            {filtrado ? "No hay clientes con esos filtros. " : "Aún no tienes clientes. "}
            {filtrado ? <Link href="/panel/crm/clientes">Quitar filtros</Link> : null}
          </Vacio>
        ) : (
          secciones.map((s) => (
            <section key={s.titulo || "lista"}>
              {s.titulo ? <h2 className="lista-seccion">{s.titulo}</h2> : null}
              <ul className="crm-lista">
                {s.personas.map((p) => (
                  <FilaPersona key={p.id} p={p} hoy={hoy} campos={f.c} />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </>
  );
}
