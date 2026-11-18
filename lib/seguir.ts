import { getDb } from "./db";
import { descifrarSeguro } from "./crypto";
import { ETAPAS, TOTAL_ETAPAS, avance, nombreEtapa } from "./etapas";
import { nombreMateria } from "./materias";

/** Estado que ve cualquiera que tenga el código: etapa y mensaje, sin nombre ni datos de contacto. */
export type EstadoPublico = {
  codigo: string;
  estado: string;
  etapa: number;
  total: number;
  nombreEtapa: string;
  materia: string;
  creadoEn: string;
  ultimaActividad: string;
  titulo: string;
  mensaje: string;
  /** ok = avanza bien · info = en espera normal · alerta = lleva demasiado sin movimiento */
  tono: "ok" | "info" | "alerta";
  /** Qué puede hacer la persona ahora (una sola línea). */
  sugerencia: string;
  anonimizada: boolean;
};

function aFecha(iso: string): number {
  return new Date(iso.replace(" ", "T") + "Z").getTime();
}

export function textoDuracion(ms: number): string {
  const min = Math.max(1, Math.floor(ms / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} ${h === 1 ? "hora" : "horas"}`;
  const dias = Math.floor(h / 24);
  return `${dias} días`;
}

type Entrada = {
  estado: string;
  conAsesor: boolean;
  confirmado: boolean;
  creadoEn: string;
  ultimaActividad: string;
  anonimizada: boolean;
  ahora?: number;
};

/** Mensaje claro según la etapa y cuánto lleva sin novedades. Función pura: se prueba sin base de datos. */
export function mensajeDeEstado(e: Entrada): Pick<EstadoPublico, "titulo" | "mensaje" | "tono" | "sugerencia"> {
  const ahora = e.ahora ?? Date.now();
  const desdeEnvio = ahora - aFecha(e.creadoEn);
  const sinNovedad = ahora - aFecha(e.ultimaActividad);
  const HORA = 3600_000;
  const DIA = 24 * HORA;
  const CAJ = "Si es urgente, también puedes acudir a la Corporación de Asistencia Judicial de tu región.";

  if (e.anonimizada) {
    return {
      titulo: "Asesoría terminada",
      mensaje: "Como se pidió, los datos personales de este caso fueron eliminados. Ya no queda nada guardado.",
      tono: "ok",
      sugerencia: "Si necesitas ayuda de nuevo, puedes contar un caso nuevo.",
    };
  }
  switch (e.estado) {
    case "nueva":
      if (!e.conAsesor) {
        if (desdeEnvio < 24 * HORA) {
          return {
            titulo: "Tu caso está a la vista de los asesores",
            mensaje: `Lo enviaste hace ${textoDuracion(desdeEnvio)}. El primero que lo tome te escribirá al correo o teléfono que dejaste.`,
            tono: "info",
            sugerencia: "No tienes que hacer nada por ahora.",
          };
        }
        return {
          titulo: "Aún ningún asesor toma tu caso",
          mensaje: `Lleva ${textoDuracion(desdeEnvio)} sin que lo tomen. Seguimos mostrándolo a los asesores disponibles.`,
          tono: "alerta",
          sugerencia: `Puedes esperar un poco más. ${CAJ}`,
        };
      }
      if (desdeEnvio < 24 * HORA) {
        return {
          titulo: "Tu asesor aún no revisa tu caso",
          mensaje: `Lo enviaste hace ${textoDuracion(desdeEnvio)}. Te escribirá al correo o teléfono que dejaste.`,
          tono: "info",
          sugerencia: "No tienes que hacer nada por ahora.",
        };
      }
      return {
        titulo: "Tu asesor todavía no responde",
        mensaje: `Lleva ${textoDuracion(desdeEnvio)} sin revisar tu caso.`,
        tono: "alerta",
        sugerencia: `Revisa tu correo y la carpeta de spam. ${CAJ}`,
      };
    case "aceptada":
    case "informe": {
      const texto = e.estado === "aceptada" ? "Tu asesor tomó tu caso" : "Tu asesor está preparando el informe";
      if (sinNovedad > 5 * DIA) {
        return {
          titulo: texto,
          mensaje: `Hace ${textoDuracion(sinNovedad)} que no hay novedades en tu caso.`,
          tono: "alerta",
          sugerencia: "Escríbele a tu asesor para pedir una actualización.",
        };
      }
      return {
        titulo: texto,
        mensaje: `Última novedad hace ${textoDuracion(sinNovedad)}.`,
        tono: "ok",
        sugerencia: "Abre el detalle para ver lo que tu asesor necesita de ti.",
      };
    }
    case "entregada":
      return {
        titulo: "Tu informe está listo",
        mensaje: "Puedes descargarlo en el detalle de tu caso.",
        tono: "ok",
        sugerencia: "Si quieres que un abogado lleve tu caso, díselo a tu asesor.",
      };
    case "derivada":
      if (e.confirmado) {
        return {
          titulo: "Un abogado tomó tu caso",
          mensaje: "El abogado confirmó que lleva tu caso y se pondrá en contacto contigo.",
          tono: "ok",
          sugerencia: "Abre el detalle para ver sus datos y verificar su título.",
        };
      }
      return {
        titulo: "Esperando al abogado",
        mensaje: sinNovedad > 7 * DIA
          ? `Hace ${textoDuracion(sinNovedad)} que el abogado no confirma.`
          : "Derivamos tu caso y esperamos que el abogado confirme que lo toma.",
        tono: sinNovedad > 7 * DIA ? "alerta" : "info",
        sugerencia: "Abre el detalle para ver a quién se derivó.",
      };
    case "cerrada":
      return { titulo: "Caso cerrado", mensaje: "Esta asesoría terminó.", tono: "ok", sugerencia: "Abre el detalle si quieres dejar una reseña." };
    case "rechazada":
      return {
        titulo: "Un asesor no pudo tomar tu caso",
        mensaje: "Puedes pedirlo de nuevo con otro asesor.",
        tono: "alerta",
        sugerencia: CAJ,
      };
    default:
      return { titulo: nombreEtapa(e.estado), mensaje: "", tono: "info", sugerencia: "" };
  }
}

export async function estadoPorCodigo(codigoCorto: string): Promise<EstadoPublico | null> {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT s.id, s.estado, s.asesor_id, s.materia, s.creado_en, s.actualizado_en, s.anonimizada_en,
                 s.abogado_confirmado, s.codigo_seguimiento,
                 (SELECT max(creado_en) FROM seguimiento WHERE solicitud_id = s.id) AS ultima
            FROM solicitudes s WHERE s.codigo_seguimiento = ?`,
    args: [codigoCorto],
  });
  const f = r.rows[0];
  if (!f) return null;
  const estado = String(f.estado);
  const actualizado = String(f.actualizado_en);
  const ultima = f.ultima ? String(f.ultima) : "";
  const ultimaActividad = ultima > actualizado ? ultima : actualizado;
  const anonimizada = String(f.anonimizada_en ?? "") !== "";
  return {
    codigo: String(f.codigo_seguimiento),
    estado,
    etapa: avance(estado),
    total: TOTAL_ETAPAS,
    nombreEtapa: nombreEtapa(estado),
    materia: nombreMateria(String(f.materia)),
    creadoEn: String(f.creado_en),
    ultimaActividad,
    anonimizada,
    ...mensajeDeEstado({
      estado,
      conAsesor: f.asesor_id !== null,
      confirmado: Number(f.abogado_confirmado) === 1,
      creadoEn: String(f.creado_en),
      ultimaActividad,
      anonimizada,
    }),
  };
}

/** Devuelve el enlace privado largo solo si el correo coincide con el que dejó la persona. */
export async function abrirConCorreo(codigoCorto: string, correo: string): Promise<string | null> {
  const d = await getDb();
  const r = await d.execute({
    sql: "SELECT codigo, email_enc FROM solicitudes WHERE codigo_seguimiento = ? AND anonimizada_en = ''",
    args: [codigoCorto],
  });
  const f = r.rows[0];
  if (!f || !String(f.email_enc)) return null;
  const guardado = descifrarSeguro(String(f.email_enc), "solicitud.email").trim().toLowerCase();
  return guardado === correo.trim().toLowerCase() ? String(f.codigo) : null;
}

export const NOMBRES_ETAPAS = ETAPAS.map((e) => e.nombre);
