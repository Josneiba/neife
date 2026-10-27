import { existsSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { getDb } from "./db";
import { insertarArticulos } from "./normas";
import type { NormaLista } from "./legalize";

export type ResumenCarga = { creadas: number; actualizadas: number; sinCambios: number; articulos: number };

/**
 * Carga normas ya separadas por artículo (desde legalize-cl). Si una norma ya está con la misma versión se deja
 * como está; si cambió, se reemplaza completa. Todo ocurre en la base: la búsqueda después no lee archivos.
 */
export async function cargarNormasLista(normas: NormaLista[], opciones: { forzar?: boolean; usuarioId?: number | null } = {}): Promise<ResumenCarga> {
  const d = await getDb();
  const r: ResumenCarga = { creadas: 0, actualizadas: 0, sinCambios: 0, articulos: 0 };
  for (const n of normas) {
    const previa = (await d.execute({ sql: "SELECT id, version FROM normas WHERE nombre = ? AND archivo = ?", args: [n.nombre, n.archivo] })).rows[0];
    if (previa && !opciones.forzar && String(previa.version) === n.version) {
      r.sinCambios++;
      continue;
    }
    if (previa) await d.execute({ sql: "DELETE FROM normas WHERE id = ?", args: [Number(previa.id)] });
    const ins = await d.execute({
      sql: "INSERT INTO normas (nombre, materia, fuente, archivo, subido_por, bcn_id, version, modo, revisada_en) VALUES (?, ?, ?, ?, ?, ?, ?, 'articulos', ahora())",
      args: [n.nombre, n.materia, n.fuente, n.archivo, opciones.usuarioId ?? null, n.bcnId, n.version],
    });
    const id = Number(ins.lastInsertRowid);
    try {
      await insertarArticulos(id, n.piezas);
    } catch (e) {
      await d.execute({ sql: "DELETE FROM normas WHERE id = ?", args: [id] });
      throw e;
    }
    r.articulos += n.piezas.length;
    if (previa) r.actualizadas++;
    else r.creadas++;
  }
  return r;
}

/** Lee el paquete de leyes base que viaja con la aplicación. */
export function leerPaqueteBase(): NormaLista[] {
  const ruta = join(process.cwd(), "biblioteca", "base.json.gz");
  if (!existsSync(ruta)) throw new Error("Falta biblioteca/base.json.gz en el despliegue.");
  return JSON.parse(gunzipSync(readFileSync(ruta)).toString("utf8")).normas as NormaLista[];
}
