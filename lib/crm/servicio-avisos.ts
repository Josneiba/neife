import { getDb } from "../db";
import { GESTIONES, nombreHito, tipoCita, type GestionClave } from "./catalogo";
import { ahoraLocal, diasEntre, hoyLocal, inicioPeriodo, sumarDias } from "./fechas";
import {
  condicionFiltro,
  contarPeriodos,
  listarPersonas,
  listarTareas,
  metasVigentes,
  solicitudesPorImportar,
  type FiltroClave,
  type PersonaCrm,
} from "./servicio";
import { citasPendientes, type Cita } from "./servicio-citas";
import { evaluarCartera, listarDerivaciones } from "./servicio-seguimiento";

/**
 * Notificaciones y gestiones abiertas. Nada se guarda: se calculan cada vez a partir de lo que
 * hay en el CRM, así nunca quedan avisos viejos. Lo único que se guarda es lo que el abogado
 * pospone o descarta (crm_avisos_ocultos).
 */

export type Aviso = {
  clave: string;
  nivel: "urgente" | "aviso" | "info";
  titulo: string;
  detalle: string;
  href: string;
  personaId?: number | null;
};

const PESO = { urgente: 0, aviso: 1, info: 2 } as const;

export async function ocultarAviso(abogadoId: number, clave: string, dias: number, hoy = hoyLocal()): Promise<void> {
  const d = await getDb();
  await d.execute({
    sql: `INSERT INTO crm_avisos_ocultos (abogado_id, clave, hasta) VALUES (?, ?, ?)
          ON CONFLICT (abogado_id, clave) DO UPDATE SET hasta = EXCLUDED.hasta`,
    args: [abogadoId, clave.slice(0, 80), sumarDias(hoy, Math.max(1, Math.min(60, dias)))],
  });
}

export async function avisos(abogadoId: number, opts: { hoy?: string; hora?: string; incluirOcultos?: boolean } = {}): Promise<Aviso[]> {
  const ahora = ahoraLocal();
  const hoy = opts.hoy ?? ahora.fecha;
  const hora = opts.hora ?? ahora.hora;
  const d = await getDb();
  const sem = inicioPeriodo("semana", hoy);

  const [citas, hitos, tareas, vencidos, sinMov, prospectos, derivs, cartera, ocultos, solic, porImportar, cSem, mSem, sinOpinion] = await Promise.all([
    citasPendientes(abogadoId, hoy, sumarDias(hoy, 1)),
    listarPersonas(abogadoId, { filtro: "hito_proximo", limite: 50 }, hoy),
    listarTareas(abogadoId, { hasta: hoy }),
    listarPersonas(abogadoId, { filtro: "vencidos", limite: 200 }, hoy),
    listarPersonas(abogadoId, { filtro: "sin_contacto", limite: 200 }, hoy),
    d.execute({ sql: "SELECT COUNT(*)::int AS n FROM crm_personas WHERE abogado_id = ? AND etapa = 'prospecto' AND creado_en <= ahora(-2)", args: [abogadoId] }),
    listarDerivaciones(abogadoId),
    evaluarCartera(abogadoId, hoy),
    d.execute({ sql: "SELECT clave FROM crm_avisos_ocultos WHERE abogado_id = ? AND hasta >= ?", args: [abogadoId, hoy] }),
    d.execute({ sql: "SELECT COUNT(*)::int AS n FROM solicitudes WHERE asesor_id = ? AND estado = 'nueva'", args: [abogadoId] }),
    solicitudesPorImportar(abogadoId),
    contarPeriodos(abogadoId, "semana", [sem]),
    metasVigentes(abogadoId, "semana", sem),
    d.execute({
      sql: `SELECT COUNT(*)::int AS n FROM crm_personas WHERE abogado_id = ? AND satisfaccion = 0 AND ultima_asesoria <> ''
            AND ultima_asesoria <= ? AND ultima_asesoria >= ?`,
      args: [abogadoId, sumarDias(hoy, -3), sumarDias(hoy, -45)],
    }),
  ]);

  const lista: Aviso[] = [];
  const poner = (a: Aviso) => lista.push(a);

  for (const c of citas) {
    const esHoy = c.fecha === hoy;
    const minutos = esHoy ? Number(c.horaIni.slice(0, 2)) * 60 + Number(c.horaIni.slice(3)) - (Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3))) : 9999;
    poner({
      clave: `cita:${c.id}`,
      nivel: esHoy && minutos <= 180 ? "urgente" : "aviso",
      titulo: `${esHoy ? "Hoy" : "Mañana"} ${c.horaIni}: ${tipoCita(c.tipo).nombre.toLowerCase()}${c.persona ? ` con ${c.persona}` : c.titulo ? ` · ${c.titulo}` : ""}`,
      detalle: esHoy && minutos > 0 && minutos <= 180 ? `Empieza en ${minutos < 60 ? `${minutos} min` : `${Math.round(minutos / 60)} h`}.` : "Confirma con el cliente y prepara los documentos.",
      href: `/panel/crm/agenda?d=${c.fecha}`,
      personaId: c.personaId,
    });
  }
  for (const p of hitos) {
    if (["cerrado", "perdido", "derivado"].includes(p.etapa)) continue;
    const dias = diasEntre(hoy, p.fechaHito);
    poner({
      clave: `hito:${p.id}:${p.fechaHito}`,
      nivel: dias <= 3 ? "urgente" : "info",
      titulo: `${nombreHito(p.tipoHito)} de ${p.nombre} ${dias === 0 ? "es hoy" : dias === 1 ? "es mañana" : `en ${dias} días`}`,
      detalle: "Revisa que tenga sus documentos listos y recuérdale la fecha.",
      href: `/panel/crm/clientes/${p.id}`,
      personaId: p.id,
    });
  }
  for (const t of tareas.filter((x) => !x.hecha)) {
    poner({
      clave: `tarea:${t.id}`,
      nivel: t.vence < hoy ? "urgente" : "aviso",
      titulo: `${t.vence < hoy ? "Tarea vencida" : "Tarea para hoy"}: ${t.texto}`,
      detalle: t.persona ? `Cliente: ${t.persona}` : "",
      href: "/panel/crm/tareas",
      personaId: t.personaId,
    });
  }
  if (vencidos.length) {
    poner({
      clave: `vencidos:${hoy}`,
      nivel: "aviso",
      titulo: `${vencidos.length} contacto${vencidos.length === 1 ? "" : "s"} programado${vencidos.length === 1 ? "" : "s"} para hoy o ya vencido${vencidos.length === 1 ? "" : "s"}`,
      detalle: vencidos.slice(0, 3).map((p) => p.nombre).join(", ") + (vencidos.length > 3 ? "…" : ""),
      href: "/panel/crm/gestion/sin_seguimiento",
    });
  }
  const idsVenc = new Set(vencidos.map((p) => p.id));
  const soloSinMov = sinMov.filter((p) => !idsVenc.has(p.id));
  if (soloSinMov.length) {
    poner({
      clave: `sinmov:${sem}`,
      nivel: "info",
      titulo: `${soloSinMov.length} cliente${soloSinMov.length === 1 ? "" : "s"} sin movimiento hace 7 días o más`,
      detalle: "Un mensaje breve evita que el caso se enfríe.",
      href: "/panel/crm/gestion/sin_seguimiento",
    });
  }
  const nProsp = Number(prospectos.rows[0]?.n ?? 0);
  if (nProsp) {
    poner({
      clave: `prosp:${sem}`,
      nivel: "aviso",
      titulo: `${nProsp} prospecto${nProsp === 1 ? "" : "s"} sin contactar hace más de 2 días`,
      detalle: "El primer contacto rápido aumenta las asesorías.",
      href: "/panel/crm/gestion/por_contactar",
    });
  }
  for (const v of derivs) {
    if ((v.resultado === "en_curso" || v.resultado === "sin_respuesta") && diasEntre(v.fecha, hoy) >= 7) {
      poner({
        clave: `deriv:${v.id}:${sem}`,
        nivel: "aviso",
        titulo: `${v.colega} aún no confirma el caso de ${v.persona}`,
        detalle: `Derivado hace ${diasEntre(v.fecha, hoy)} días. Pregunta cómo va y registra el resultado.`,
        href: `/panel/crm/clientes/${v.personaId}?t=progreso`,
        personaId: v.personaId,
      });
    }
  }
  const porCobrar = derivs.filter((v) => v.comisionEstado === "acordada" && diasEntre(v.fecha, hoy) >= 30);
  if (porCobrar.length) {
    poner({
      clave: `comision:${sem}`,
      nivel: "info",
      titulo: `${porCobrar.length} comisión${porCobrar.length === 1 ? "" : "es"} acordada${porCobrar.length === 1 ? "" : "s"} sin cobrar hace más de 30 días`,
      detalle: "Revisa con cada colega el estado del pago.",
      href: "/panel/crm/informes?t=derivaciones",
    });
  }
  const nOpin = Number(sinOpinion.rows[0]?.n ?? 0);
  if (nOpin) {
    poner({
      clave: `opinion:${sem}`,
      nivel: "info",
      titulo: `${nOpin} cliente${nOpin === 1 ? "" : "s"} asesorado${nOpin === 1 ? "" : "s"} sin opinión registrada`,
      detalle: "Pregunta si quedaron conformes: mejora tus informes y te da recomendaciones.",
      href: "/panel/crm/informes?t=satisfaccion",
    });
  }
  const casi = cartera.filter((x) => ["en_asesoria", "con_hito", "mandato", "derivado"].includes(x.p.etapa) && x.ev.casiListo);
  if (casi.length) {
    poner({
      clave: `casi:${sem}`,
      nivel: "info",
      titulo: `${casi.length} informe${casi.length === 1 ? "" : "s"} de avance casi listo${casi.length === 1 ? "" : "s"}`,
      detalle: casi.slice(0, 3).map((x) => `${x.p.nombre} (${x.ev.pct}%)`).join(", "),
      href: "/panel/crm/informes",
    });
  }
  const nSol = Number(solic.rows[0]?.n ?? 0);
  if (nSol) {
    poner({
      clave: `solic:${hoy}`,
      nivel: "urgente",
      titulo: `${nSol} solicitud${nSol === 1 ? "" : "es"} nueva${nSol === 1 ? "" : "s"} por responder`,
      detalle: "Personas que escribieron desde tu perfil público.",
      href: "/panel",
    });
  }
  if (porImportar > 0) {
    poner({
      clave: `importar:${sem}`,
      nivel: "info",
      titulo: `${porImportar} caso${porImportar === 1 ? "" : "s"} del panel aún no están en el CRM`,
      detalle: "Impórtalos para que cuenten en tus indicadores.",
      href: "/panel/crm/clientes",
    });
  }
  const diasRestantes = diasEntre(hoy, sumarDias(sem, 6));
  const metaAse = mSem.asesorias;
  const realAse = cSem[sem]?.asesorias ?? 0;
  if (metaAse > 0 && realAse < metaAse && diasRestantes <= 2) {
    poner({
      clave: `meta:${sem}`,
      nivel: "info",
      titulo: `Te faltan ${metaAse - realAse} asesoría${metaAse - realAse === 1 ? "" : "s"} para tu meta semanal`,
      detalle: diasRestantes === 0 ? "Hoy es el último día de la semana." : `Quedan ${diasRestantes + 1} días.`,
      href: "/panel/crm/planificacion?t=indicadores",
    });
  }

  const ocultas = new Set(ocultos.rows.map((f) => String(f.clave)));
  return lista.filter((a) => opts.incluirOcultos || !ocultas.has(a.clave)).sort((a, b) => PESO[a.nivel] - PESO[b.nivel]);
}

/* ================================ Gestiones abiertas ================================ */

const FILTRO_DE_GESTION: Partial<Record<GestionClave, FiltroClave>> = {
  hitos_14: "hito_proximo",
  referidos: "referidos",
  mandatos_por_firmar: "mandatos_por_firmar",
  sin_seguimiento: "sin_seguimiento",
  por_contactar: "por_contactar",
  postventa: "postventa",
  nuevos_mandantes: "nuevos_mandantes",
};

export type ConteosGestion = Record<GestionClave, number> & { tareas: number; notas: number };

export async function contadoresGestion(abogadoId: number, hoy = hoyLocal()): Promise<ConteosGestion> {
  const d = await getDb();
  const partes: string[] = [];
  const args: unknown[] = [];
  const claves = Object.keys(FILTRO_DE_GESTION) as GestionClave[];
  for (const k of claves) {
    const c = condicionFiltro(FILTRO_DE_GESTION[k]!, hoy);
    partes.push(`COUNT(*) FILTER (WHERE ${c.sql})::int AS ${k}`);
    args.push(...c.args);
  }
  const [r, citas, tar, notas] = await Promise.all([
    d.execute({ sql: `SELECT ${partes.join(", ")} FROM crm_personas p WHERE p.abogado_id = ?`, args: [...args, abogadoId] }),
    citasPendientes(abogadoId, hoy, sumarDias(hoy, 7)),
    d.execute({ sql: "SELECT COUNT(*)::int AS n FROM crm_tareas WHERE abogado_id = ? AND hecha = 0", args: [abogadoId] }),
    d.execute({ sql: "SELECT COUNT(*)::int AS n FROM crm_interacciones WHERE abogado_id = ? AND tipo = 'nota'", args: [abogadoId] }),
  ]);
  const salida = { citas_proximas: citas.length, tareas: Number(tar.rows[0]?.n ?? 0), notas: Number(notas.rows[0]?.n ?? 0) } as ConteosGestion;
  for (const k of claves) salida[k] = Number(r.rows[0]?.[k] ?? 0);
  return salida;
}

export async function listaGestion(abogadoId: number, clave: GestionClave, hoy = hoyLocal()): Promise<{ personas: PersonaCrm[]; citas: Cita[] }> {
  if (clave === "citas_proximas") return { personas: [], citas: await citasPendientes(abogadoId, hoy, sumarDias(hoy, 7)) };
  const filtro = FILTRO_DE_GESTION[clave];
  return { personas: filtro ? await listarPersonas(abogadoId, { filtro, limite: 300 }, hoy) : [], citas: [] };
}

export const CLAVES_GESTION = GESTIONES.map((g) => g.clave);
