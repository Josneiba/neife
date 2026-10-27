import { getDb } from "./db";
import { cifrar, descifrarSeguro } from "./crypto";
import type { Estado } from "./etapas";

/* ---------- Perfiles de asesores ---------- */

export type Perfil = {
  usuarioId: number;
  slug: string;
  nombre: string;
  titulo: string;
  registro: string;
  materias: string[];
  ubicacion: string;
  bio: string;
  precioInforme: number;
  metaSemanal: number;
  instruccionesPago: string;
  publicado: boolean;
  estado: string;
};

type Fila = Record<string, unknown>;

function aPerfil(f: Fila): Perfil {
  return {
    usuarioId: Number(f.usuario_id),
    slug: String(f.slug),
    nombre: String(f.nombre),
    titulo: String(f.titulo),
    registro: String(f.registro),
    materias: String(f.materias).split(",").filter(Boolean),
    ubicacion: String(f.ubicacion),
    bio: String(f.bio),
    precioInforme: Number(f.precio_informe),
    metaSemanal: Number(f.meta_semanal ?? 3),
    instruccionesPago: String(f.instrucciones_pago),
    publicado: Number(f.publicado) === 1,
    estado: String(f.estado),
  };
}

const SELECT_PERFIL = `SELECT p.*, u.nombre, u.estado FROM perfiles p JOIN usuarios u ON u.id = p.usuario_id`;

/** Solo asesores verificados y con el perfil publicado. */
export async function listarAsesoresPublicos(): Promise<Perfil[]> {
  const d = await getDb();
  const r = await d.execute(
    `${SELECT_PERFIL} WHERE u.rol = 'abogado' AND u.estado = 'activo' AND p.publicado = 1 ORDER BY u.creado_en`,
  );
  return r.rows.map(aPerfil);
}

export async function obtenerAsesorPublico(id: number): Promise<Perfil | null> {
  const d = await getDb();
  const r = await d.execute({
    sql: `${SELECT_PERFIL} WHERE u.id = ? AND u.rol = 'abogado' AND u.estado = 'activo' AND p.publicado = 1`,
    args: [id],
  });
  return r.rows[0] ? aPerfil(r.rows[0]) : null;
}

export async function obtenerPerfil(usuarioId: number): Promise<Perfil | null> {
  const d = await getDb();
  const r = await d.execute({ sql: `${SELECT_PERFIL} WHERE p.usuario_id = ?`, args: [usuarioId] });
  return r.rows[0] ? aPerfil(r.rows[0]) : null;
}

export function slugDe(nombre: string): string {
  return (
    nombre
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "asesor"
  );
}

export async function slugLibre(nombre: string): Promise<string> {
  const d = await getDb();
  const base = slugDe(nombre);
  let candidato = base;
  for (let i = 2; i < 500; i++) {
    const r = await d.execute({ sql: "SELECT 1 FROM perfiles WHERE slug = ?", args: [candidato] });
    if (r.rows.length === 0) return candidato;
    candidato = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

/* ---------- Solicitudes ---------- */

export type Solicitud = {
  id: number;
  codigo: string;
  asesorId: number;
  clienteId: number | null;
  materia: string;
  region: string;
  urgencia: string;
  presupuesto: string;
  relato: string;
  nombre: string;
  email: string;
  telefono: string;
  estado: Estado;
  motivoRechazo: string;
  derivarOk: boolean;
  conservarDatos: boolean;
  anonimizada: boolean;
  abogadoDestino: string;
  abogadoConfirmado: boolean;
  proximoContacto: string;
  resultado: string;
  origen: string;
  creadoEn: string;
  actualizadoEn: string;
};

function aSolicitud(f: Fila): Solicitud {
  return {
    id: Number(f.id),
    codigo: String(f.codigo),
    asesorId: Number(f.asesor_id),
    clienteId: f.cliente_id === null ? null : Number(f.cliente_id),
    materia: String(f.materia),
    region: String(f.region),
    urgencia: String(f.urgencia),
    presupuesto: String(f.presupuesto),
    relato: descifrarSeguro(String(f.relato_enc), "solicitud.relato"),
    nombre: descifrarSeguro(String(f.nombre_enc), "solicitud.nombre"),
    email: descifrarSeguro(String(f.email_enc), "solicitud.email"),
    telefono: f.telefono_enc ? descifrarSeguro(String(f.telefono_enc), "solicitud.telefono") : "",
    estado: String(f.estado) as Solicitud["estado"],
    motivoRechazo: String(f.motivo_rechazo),
    derivarOk: Number(f.derivar_ok) === 1,
    conservarDatos: Number(f.conservar_datos) === 1,
    anonimizada: String(f.anonimizada_en ?? "") !== "",
    abogadoDestino: f.abogado_destino_enc ? descifrarSeguro(String(f.abogado_destino_enc), "solicitud.abogado") : "",
    abogadoConfirmado: Number(f.abogado_confirmado) === 1,
    proximoContacto: String(f.proximo_contacto ?? ""),
    resultado: String(f.resultado ?? ""),
    origen: String(f.origen ?? "web"),
    creadoEn: String(f.creado_en),
    actualizadoEn: String(f.actualizado_en),
  };
}

export async function listarSolicitudesAsesor(asesorId: number, estado?: string): Promise<Solicitud[]> {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT * FROM solicitudes WHERE asesor_id = ? ${estado ? "AND estado = ?" : ""} ORDER BY creado_en DESC, id DESC`,
    args: estado ? [asesorId, estado] : [asesorId],
  });
  return r.rows.map(aSolicitud);
}

export async function contarSolicitudesAsesor(asesorId: number): Promise<Record<string, number>> {
  const d = await getDb();
  const r = await d.execute({
    sql: "SELECT estado, COUNT(*) AS n FROM solicitudes WHERE asesor_id = ? GROUP BY estado",
    args: [asesorId],
  });
  const salida: Record<string, number> = {};
  for (const f of r.rows) salida[String(f.estado)] = Number(f.n);
  return salida;
}

export async function obtenerSolicitudAsesor(id: number, asesorId: number): Promise<Solicitud | null> {
  const d = await getDb();
  const r = await d.execute({ sql: "SELECT * FROM solicitudes WHERE id = ? AND asesor_id = ?", args: [id, asesorId] });
  return r.rows[0] ? aSolicitud(r.rows[0]) : null;
}

export async function obtenerSolicitudPorCodigo(codigo: string): Promise<Solicitud | null> {
  if (!/^[A-Za-z0-9_-]{10,64}$/.test(codigo)) return null;
  const d = await getDb();
  const r = await d.execute({ sql: "SELECT * FROM solicitudes WHERE codigo = ?", args: [codigo] });
  return r.rows[0] ? aSolicitud(r.rows[0]) : null;
}

export async function listarSolicitudesCliente(clienteId: number): Promise<Solicitud[]> {
  const d = await getDb();
  const r = await d.execute({
    sql: "SELECT * FROM solicitudes WHERE cliente_id = ? ORDER BY creado_en DESC, id DESC",
    args: [clienteId],
  });
  return r.rows.map(aSolicitud);
}

/* ---------- Informes ---------- */

export type NormaInforme = {
  articuloId: number;
  norma: string;
  numero: string;
  texto: string;
  incluir: boolean;
  comentario: string;
  /** Fuente y versión del texto, para citarlas en el informe. */
  fuente?: string;
  version?: string;
};

export type ContenidoInforme = {
  materia: string;
  objeto: string;
  conclusiones: string;
  resumen: string;
  normas: NormaInforme[];
  puntos: string;
  cronologia: string;
  derechos: string[];
  vias: string;
  plazos: string;
  datos: string[];
  documentos: string[];
  faltantes: string[];
  preguntas: string[];
  abogadoDestino: string;
  observaciones: string;
};

export type Informe = {
  id: number;
  solicitudId: number;
  asesorId: number;
  estado: "borrador" | "final";
  entregado: boolean;
  contenido: ContenidoInforme;
  creadoEn: string;
  actualizadoEn: string;
};

export function contenidoVacio(): ContenidoInforme {
  return {
    materia: "otra",
    objeto: "",
    conclusiones: "",
    resumen: "",
    normas: [],
    puntos: "",
    cronologia: "",
    derechos: [],
    vias: "",
    plazos: "",
    datos: [],
    documentos: [],
    faltantes: [],
    preguntas: [],
    abogadoDestino: "",
    observaciones: "",
  };
}

function aInforme(f: Fila): Informe {
  let contenido: ContenidoInforme;
  try {
    contenido = { ...contenidoVacio(), ...JSON.parse(descifrarSeguro(String(f.contenido_enc), "informe.contenido")) };
  } catch {
    contenido = { ...contenidoVacio(), resumen: "[no se pudo leer el contenido]" };
  }
  return {
    id: Number(f.id),
    solicitudId: Number(f.solicitud_id),
    asesorId: Number(f.asesor_id),
    estado: String(f.estado) as Informe["estado"],
    entregado: Number(f.entregado) === 1,
    contenido,
    creadoEn: String(f.creado_en),
    actualizadoEn: String(f.actualizado_en),
  };
}

export async function obtenerInforme(id: number, asesorId: number): Promise<Informe | null> {
  const d = await getDb();
  const r = await d.execute({ sql: "SELECT * FROM informes WHERE id = ? AND asesor_id = ?", args: [id, asesorId] });
  return r.rows[0] ? aInforme(r.rows[0]) : null;
}

export async function obtenerInformePorSolicitud(solicitudId: number): Promise<Informe | null> {
  const d = await getDb();
  const r = await d.execute({ sql: "SELECT * FROM informes WHERE solicitud_id = ?", args: [solicitudId] });
  return r.rows[0] ? aInforme(r.rows[0]) : null;
}

export async function listarInformesAsesor(asesorId: number) {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT i.id, i.estado, i.entregado, i.actualizado_en, s.codigo, s.materia
            FROM informes i JOIN solicitudes s ON s.id = i.solicitud_id
           WHERE i.asesor_id = ? ORDER BY i.actualizado_en DESC, i.id DESC`,
    args: [asesorId],
  });
  return r.rows.map((f) => ({
    id: Number(f.id),
    estado: String(f.estado) as "borrador" | "final",
    entregado: Number(f.entregado) === 1,
    actualizadoEn: String(f.actualizado_en),
    codigo: String(f.codigo),
    materia: String(f.materia),
  }));
}


/* ---------- Pendientes e historial de cada caso ---------- */

export type Pendiente = { id: number; texto: string; hecho: boolean };

export async function listarPendientes(solicitudId: number): Promise<Pendiente[]> {
  const d = await getDb();
  const r = await d.execute({
    sql: "SELECT id, texto_enc, hecho FROM pendientes WHERE solicitud_id = ? ORDER BY hecho, id",
    args: [solicitudId],
  });
  return r.rows.map((f) => ({
    id: Number(f.id),
    texto: descifrarSeguro(String(f.texto_enc), "pendiente.texto"),
    hecho: Number(f.hecho) === 1,
  }));
}

export async function agregarPendientes(solicitudId: number, textos: string[]) {
  if (textos.length === 0) return;
  const d = await getDb();
  await d.batch(
    textos.map((t) => ({
      sql: "INSERT INTO pendientes (solicitud_id, texto_enc) VALUES (?, ?)",
      args: [solicitudId, cifrar(t.slice(0, 200), "pendiente.texto")],
    })),
    "write",
  );
}

export type Evento = { id: number; tipo: "etapa" | "nota"; texto: string; creadoEn: string };

export async function listarSeguimiento(solicitudId: number): Promise<Evento[]> {
  const d = await getDb();
  const r = await d.execute({
    sql: "SELECT id, tipo, texto_enc, creado_en FROM seguimiento WHERE solicitud_id = ? ORDER BY id DESC",
    args: [solicitudId],
  });
  return r.rows.map((f) => ({
    id: Number(f.id),
    tipo: String(f.tipo) as Evento["tipo"],
    texto: descifrarSeguro(String(f.texto_enc), "seguimiento.texto"),
    creadoEn: String(f.creado_en),
  }));
}

export async function registrarEvento(solicitudId: number, tipo: "etapa" | "nota", texto: string) {
  const d = await getDb();
  await d.execute({
    sql: "INSERT INTO seguimiento (solicitud_id, tipo, texto_enc) VALUES (?, ?, ?)",
    args: [solicitudId, tipo, cifrar(texto.slice(0, 1000), "seguimiento.texto")],
  });
}

/** Datos para la tabla del CRM: un caso por fila, con lo que falta y el siguiente paso. */
export type FilaCaso = {
  solicitud: Solicitud;
  informe: { id: number; estado: "borrador" | "final"; entregado: boolean } | null;
  pendientes: Pendiente[];
};

export async function listarCasos(asesorId: number): Promise<FilaCaso[]> {
  const solicitudes = await listarSolicitudesAsesor(asesorId);
  if (solicitudes.length === 0) return [];
  const d = await getDb();
  const [inf, pen] = await Promise.all([
    d.execute({ sql: "SELECT id, solicitud_id, estado, entregado FROM informes WHERE asesor_id = ?", args: [asesorId] }),
    d.execute({
      sql: `SELECT p.id, p.solicitud_id, p.texto_enc, p.hecho FROM pendientes p
              JOIN solicitudes s ON s.id = p.solicitud_id WHERE s.asesor_id = ? ORDER BY p.hecho, p.id`,
      args: [asesorId],
    }),
  ]);
  const informes = new Map(inf.rows.map((f) => [Number(f.solicitud_id), f]));
  const pendientes = new Map<number, Pendiente[]>();
  for (const f of pen.rows) {
    const k = Number(f.solicitud_id);
    const lista = pendientes.get(k) ?? [];
    lista.push({
      id: Number(f.id),
      texto: descifrarSeguro(String(f.texto_enc), "pendiente.texto"),
      hecho: Number(f.hecho) === 1,
    });
    pendientes.set(k, lista);
  }
  return solicitudes.map((s) => {
    const i = informes.get(s.id);
    return {
      solicitud: s,
      informe: i
        ? { id: Number(i.id), estado: String(i.estado) as "borrador" | "final", entregado: Number(i.entregado) === 1 }
        : null,
      pendientes: pendientes.get(s.id) ?? [],
    };
  });
}

/**
 * Elige asesor cuando la persona no escoge: entre los verificados, prefiere los que atienden esa materia
 * y, entre ellos, al que tiene menos solicitudes sin resolver. Así el reparto es parejo.
 */
export async function asignarAsesor(materia: string): Promise<Perfil | null> {
  const lista = await listarAsesoresPublicos();
  if (lista.length === 0) return null;
  const d = await getDb();
  const carga = await d.execute(
    "SELECT asesor_id, COUNT(*) AS n FROM solicitudes WHERE estado IN ('nueva','aceptada','informe','entregada','derivada') GROUP BY asesor_id",
  );
  const n = new Map(carga.rows.map((f) => [Number(f.asesor_id), Number(f.n)]));
  const aptos = lista.filter((a) => a.materias.length === 0 || a.materias.includes(materia));
  const base = aptos.length ? aptos : lista;
  return [...base].sort((a, b) => (n.get(a.usuarioId) ?? 0) - (n.get(b.usuarioId) ?? 0))[0];
}

/** Cifras de la semana de un asesor: lo que llegó y los clientes que ya tienen abogado confirmado. */
export async function resumenSemana(asesorId: number) {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT SUM(CASE WHEN creado_en >= ahora(-7) THEN 1 ELSE 0 END) AS nuevas,
                 SUM(CASE WHEN abogado_confirmado = 1 AND actualizado_en >= ahora(-7) THEN 1 ELSE 0 END) AS confirmados
            FROM solicitudes WHERE asesor_id = ?`,
    args: [asesorId],
  });
  const p = await obtenerPerfil(asesorId);
  return { nuevas: Number(r.rows[0]?.nuevas ?? 0), confirmados: Number(r.rows[0]?.confirmados ?? 0), meta: p?.metaSemanal ?? 3 };
}
