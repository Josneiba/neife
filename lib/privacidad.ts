import { getDb, auditar } from "./db";
import { cifrar } from "./crypto";

/** Días que la persona tiene para descargar su informe después de terminar la asesoría. */
export const DIAS_DE_GRACIA = 15;

/**
 * Elimina los datos personales de un caso y deja solo lo anónimo (materia, etapa, fechas, resultado),
 * que sirve para las estadísticas del asesor. Borra relato, contacto, informe, antecedentes e historial.
 */
export async function anonimizarSolicitud(id: number) {
  const d = await getDb();
  await d.batch(
    [
      { sql: "DELETE FROM informes WHERE solicitud_id = ?", args: [id] },
      { sql: "DELETE FROM pendientes WHERE solicitud_id = ?", args: [id] },
      { sql: "DELETE FROM documentos WHERE solicitud_id = ?", args: [id] },
      { sql: "DELETE FROM seguimiento WHERE solicitud_id = ?", args: [id] },
      {
        sql: `UPDATE solicitudes
                 SET relato_enc = ?, nombre_enc = ?, email_enc = ?, telefono_enc = '', abogado_destino_enc = '',
                     cliente_id = NULL, anonimizada_en = ahora()
               WHERE id = ?`,
        args: [
          cifrar("Los datos personales de este caso fueron eliminados al terminar la asesoría.", "solicitud.relato"),
          cifrar("Datos eliminados", "solicitud.nombre"),
          cifrar("", "solicitud.email"),
          id,
        ],
      },
    ],
    "write",
  );
  await auditar(null, "datos_anonimizados", "solicitud", id);
}

/**
 * Anonimiza los casos terminados cuya persona no pidió guardar sus datos.
 * Terminado = cerrado, rechazado, o derivado con abogado confirmado; y pasados los días de gracia.
 */
export async function purgarTerminadas(): Promise<number> {
  const d = await getDb();
  const r = await d.execute({
    sql: `SELECT id FROM solicitudes
           WHERE conservar_datos = 0 AND anonimizada_en = ''
             AND (estado IN ('cerrada','rechazada') OR (estado = 'derivada' AND abogado_confirmado = 1))
             AND actualizado_en < ahora(?)`,
    args: [-DIAS_DE_GRACIA],
  });
  for (const f of r.rows) await anonimizarSolicitud(Number(f.id));
  return r.rows.length;
}
