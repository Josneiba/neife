import { getDb, auditar } from "./db";
import { crearNorma, eliminarNorma } from "./normas";
import { descargarNormaActual, type NormaLeyChile } from "./leychile";

export type ResumenRevision = {
  revisadas: number;
  actualizadas: string[];
  sinCambios: number;
  fallidas: { nombre: string; motivo: string }[];
  derogadas: string[];
};

type Descargar = (id: string) => Promise<NormaLeyChile>;

/**
 * Revisa en LeyChile las normas importadas de ahí y reemplaza las que cambiaron de versión.
 * Procesa las menos revisadas primero y se detiene al llegar a `maximo`, para no pasar el tiempo
 * permitido de una función en Vercel; el aviso diario va completando el resto.
 */
export async function revisarNormas(opciones: { maximo?: number; descargar?: Descargar; adminId?: number | null } = {}): Promise<ResumenRevision> {
  const { maximo = 5, descargar = descargarNormaActual, adminId = null } = opciones;
  const d = await getDb();
  const lista = await d.execute({
    sql: `SELECT id, nombre, materia, bcn_id, version FROM normas
           WHERE bcn_id <> '' ORDER BY revisada_en ASC, id ASC LIMIT ?`,
    args: [maximo],
  });
  const res: ResumenRevision = { revisadas: 0, actualizadas: [], sinCambios: 0, fallidas: [], derogadas: [] };
  for (const f of lista.rows) {
    const id = Number(f.id);
    const nombre = String(f.nombre);
    res.revisadas++;
    try {
      const norma = await descargar(String(f.bcn_id));
      if (norma.derogada) res.derogadas.push(nombre);
      if (norma.piezas.length === 0) throw new Error("LeyChile no entregó artículos.");
      if (norma.version && norma.version === String(f.version)) {
        res.sinCambios++;
        await d.execute({ sql: "UPDATE normas SET revisada_en = ahora(), error_revision = '' WHERE id = ?", args: [id] });
        continue;
      }
      const nueva = await crearNorma({
        nombre,
        materia: String(f.materia),
        fuente: `https://www.leychile.cl/Navegar?idNorma=${f.bcn_id}`,
        archivo: `leychile-${f.bcn_id}.xml`,
        usuarioId: adminId,
        piezas: norma.piezas,
        bcnId: String(f.bcn_id),
        version: norma.version,
      });
      await eliminarNorma(id);
      await auditar(adminId, "norma_actualizada_auto", "norma", nueva.normaId);
      res.actualizadas.push(nombre);
    } catch (e) {
      const motivo = e instanceof Error ? e.message : String(e);
      res.fallidas.push({ nombre, motivo });
      await d.execute({ sql: "UPDATE normas SET revisada_en = ahora(), error_revision = ? WHERE id = ?", args: [motivo.slice(0, 300), id] });
    }
  }
  return res;
}
