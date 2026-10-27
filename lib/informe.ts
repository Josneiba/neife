import { buscarArticulos } from "./normas";
import { PLANTILLAS, esMateria } from "./materias";
import type { ContenidoInforme, Solicitud } from "./datos";
import { cronologiaDesdeRelato } from "./informe-completitud";
import { nombreMateria } from "./materias";

/**
 * Borrador automático del informe. No usa inteligencia artificial: junta
 *  - el relato de la persona,
 *  - los artículos de la biblioteca que mejor coinciden con ese relato (texto literal),
 *  - los documentos y preguntas habituales de la materia.
 * El asesor lo revisa y lo corrige antes de entregarlo.
 */
export async function borradorDeInforme(s: Solicitud, pendientesAbiertos: string[] = []): Promise<ContenidoInforme> {
  let encontrados = await buscarArticulos(s.relato, { materia: s.materia, limite: 8 });
  if (encontrados.length === 0) encontrados = await buscarArticulos(s.relato, { limite: 8 });

  const plantilla = PLANTILLAS[esMateria(s.materia) ? s.materia : "otra"];
  return {
    materia: s.materia,
    objeto: `Orientación general en materia ${nombreMateria(s.materia).toLowerCase()}: determinar qué normas chilenas podrían aplicarse a la situación descrita, qué vías existen y qué antecedentes faltan para que un abogado evalúe el caso.`,
    conclusiones: "",
    resumen: s.relato,
    normas: encontrados.map((a, i) => ({
      articuloId: a.id,
      norma: a.norma,
      numero: a.numero,
      texto: a.texto,
      // Se proponen los más relevantes; el resto queda a la vista, sin marcar.
      incluir: i < 4,
      comentario: "",
      fuente: a.fuente,
      version: a.version,
    })),
    puntos: "",
    cronologia: cronologiaDesdeRelato(s.relato),
    derechos: [...plantilla.derechos],
    vias: plantilla.vias,
    plazos: plantilla.plazos,
    datos: [...plantilla.datos],
    documentos: [...plantilla.documentos],
    faltantes: pendientesAbiertos,
    preguntas: [...plantilla.preguntas],
    abogadoDestino: "",
    observaciones: "",
  };
}
