"use server";

import { getDb } from "../db";
import { ipActual } from "../guards";
import { mensajeError } from "../errores";
import { permitir } from "../ratelimit";
import { esMateria, PLANTILLAS } from "../materias";
import { buscarArticulos } from "../normas";
import { esencialesFaltantes, normasFaltantes } from "../fuentes";
import { fuenteVerificadaPorNombre, urlNormaLeyChile } from "../leychile";

export type NormaSugerida = { id: number; norma: string; numero: string; texto: string; fuente: string; enlace: string | null };
export type Contexto = { derechos: string[]; vias: string; plazos: string };
export type RespuestaNormas = { ok: true; normas: NormaSugerida[]; contexto: Contexto; pendientes: string[]; sinBase: boolean } | { ok: false; error: string };

/**
 * Busca en la biblioteca los artículos que se parecen al relato. No guarda nada:
 * el relato solo se usa para esta búsqueda y no queda registrado.
 */
async function consultarNormasInterna(materia: string, relato: string): Promise<RespuestaNormas> {
  const texto = String(relato ?? "").trim().slice(0, 1500);
  if (texto.length < 40) return { ok: false, error: "Cuéntalo con un poco más de detalle (mínimo 40 caracteres)." };
  if (!esMateria(materia)) return { ok: false, error: "Elige una materia." };

  const ip = await ipActual();
  if (!(await permitir(`consulta:${ip}`, 40, 60 * 60 * 1000))) {
    return { ok: false, error: "Hiciste muchas consultas seguidas. Espera un rato y vuelve a probar." };
  }

  // Si falta la norma principal de la materia, no se muestran resultados parciales: darían una guía incorrecta.
  const esenciales = await esencialesFaltantes(materia);
  const sinBase = esenciales.length > 0;
  const encontrados = sinBase ? [] : await buscarArticulos(texto, { materia, limite: 6 });
  // Solo se anota la materia y cuántas normas se encontraron (nunca el relato): sirve para saber qué leyes faltan.
  getDb()
    .then((d) => d.execute({ sql: "INSERT INTO consultas_log (materia, resultados) VALUES (?, ?)", args: [materia, encontrados.length] }))
    .catch((e) => console.error("No se pudo registrar el conteo de la consulta legal.", e));
  return {
    ok: true,
    pendientes: sinBase ? esenciales : await normasFaltantes(materia),
    sinBase,
    contexto: { derechos: PLANTILLAS[materia].derechos, vias: PLANTILLAS[materia].vias, plazos: PLANTILLAS[materia].plazos },
    normas: encontrados.map((a) => {
      const fuenteConocida = fuenteVerificadaPorNombre(a.norma);
      const bcnId = a.bcnId || fuenteConocida?.id || "";
      const enlace = urlNormaLeyChile(bcnId, !a.bcnId ? fuenteConocida?.parte : undefined);
      return {
        id: a.id,
        norma: a.norma,
        numero: a.numero,
        texto: a.texto.slice(0, 1200),
        fuente: enlace ? `BCN Ley Chile${a.bcnId && a.version ? `, versión del ${a.version}` : ""}` : "No encontramos una fuente oficial verificable para esta norma.",
        enlace,
      };
    }),
  };
}

export async function consultarNormas(materia: string, relato: string): Promise<RespuestaNormas> {
  try {
    return await consultarNormasInterna(materia, relato);
  } catch (e) {
    return { ok: false, error: mensajeError(e, "buscar las normas") };
  }
}
