import { getDb } from "./db";
import { obtenerPerfil } from "./datos";
import { leerHorario } from "./agenda-publica";
import { resumenResenas, tiempoRespuestaHoras, textoTiempo } from "./resenas";

export type ItemVisibilidad = { ok: boolean; texto: string; peso: number; href: string };

export type Visibilidad = {
  puntaje: number;
  items: ItemVisibilidad[];
  horas: number | null;
  respuesta: string;
  resenas: { promedio: number; total: number };
  porEnlace: number;
  siguiente: ItemVisibilidad | null;
};

/** Cómo se ve el perfil del asesor para quien lo busca, y qué le falta para aparecer mejor. */
export async function comoTeVen(asesorId: number): Promise<Visibilidad | null> {
  const perfil = await obtenerPerfil(asesorId);
  if (!perfil) return null;
  const [horario, resenas, horas, d] = await Promise.all([
    leerHorario(asesorId),
    resumenResenas(asesorId),
    tiempoRespuestaHoras(asesorId),
    getDb(),
  ]);
  const enlace = await d.execute({ sql: "SELECT COUNT(*) AS n FROM solicitudes WHERE asesor_id = ? AND origen = 'enlace'", args: [asesorId] });
  const items: ItemVisibilidad[] = [
    { ok: perfil.verificadoEn !== "", texto: "Cuenta verificada", peso: 20, href: "/panel/perfil#t-datos" },
    { ok: perfil.bio.trim().length >= 40, texto: "Presentación clara (40 letras o más)", peso: 15, href: "/panel/perfil#t-datos" },
    { ok: perfil.materias.length > 0, texto: "Materias que orientas", peso: 10, href: "/panel/perfil#t-datos" },
    { ok: horario.activo, texto: "Horas abiertas para reservar", peso: 15, href: "/panel/perfil#t-horario" },
    { ok: perfil.honorarios.length > 0, texto: "Honorarios a la vista", peso: 10, href: "/panel/perfil#t-datos" },
    { ok: perfil.direccion !== "" && perfil.lat != null, texto: "Dirección con mapa", peso: 5, href: "/panel/perfil#t-datos" },
    { ok: horas !== null && horas <= 24, texto: "Respondes en menos de 24 horas", peso: 15, href: "/panel/bandeja" },
    { ok: resenas.total > 0, texto: "Al menos una reseña", peso: 10, href: "/panel/crm/consejos" },
  ];
  const puntaje = items.reduce((s, i) => s + (i.ok ? i.peso : 0), 0);
  const siguiente = items.filter((i) => !i.ok).sort((a, b) => b.peso - a.peso)[0] ?? null;
  return {
    puntaje,
    items,
    horas,
    respuesta: horas !== null ? textoTiempo(horas) : "Sin datos aún",
    resenas: { promedio: resenas.promedio, total: resenas.total },
    porEnlace: Number(enlace.rows[0]?.n ?? 0),
    siguiente,
  };
}
