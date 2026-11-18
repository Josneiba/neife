import { getDb } from "./db";
import { descifrarSeguro } from "./crypto";

/**
 * Revisión de conflicto de interés: compara la contraparte que escribió la persona con los
 * clientes y casos del propio asesor. Todo ocurre en el servidor del asesor; no sale ningún dato.
 * Es una ayuda para no pasar nada por alto, no reemplaza el criterio profesional.
 */
export type Conflicto = { nombre: string; origen: "cliente" | "caso"; id: number; etapa?: string };

const SIN_VALOR = new Set(["de", "del", "la", "las", "los", "el", "y", "e", "spa", "sa", "ltda", "limitada", "eirl", "cia", "compania", "empresa", "sociedad", "don", "dona"]);

function normalizar(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function palabras(t: string): string[] {
  return normalizar(t).split(" ").filter((p) => p.length >= 2 && !SIN_VALOR.has(p));
}

/** Dos nombres coinciden si uno contiene todas las palabras del otro (mínimo dos palabras) o son idénticos. */
export function coincideNombre(a: string, b: string): boolean {
  const pa = palabras(a);
  const pb = palabras(b);
  if (!pa.length || !pb.length) return false;
  if (pa.join(" ") === pb.join(" ")) return true;
  const menor = pa.length <= pb.length ? pa : pb;
  const mayor = pa.length <= pb.length ? pb : pa;
  if (menor.length < 2) return false;
  return menor.every((p) => mayor.includes(p));
}

export async function buscarConflictos(asesorId: number, contraparte: string): Promise<Conflicto[]> {
  if (palabras(contraparte).length === 0) return [];
  const d = await getDb();
  const [personas, casos] = await Promise.all([
    d.execute({ sql: "SELECT id, nombre_enc, etapa FROM crm_personas WHERE abogado_id = ? ORDER BY id DESC LIMIT 2000", args: [asesorId] }),
    d.execute({ sql: "SELECT id, nombre_enc FROM solicitudes WHERE asesor_id = ? AND anonimizada_en = '' AND nombre_enc <> '' ORDER BY id DESC LIMIT 2000", args: [asesorId] }),
  ]);
  const vistos = new Set<string>();
  const salida: Conflicto[] = [];
  for (const f of personas.rows) {
    const nombre = descifrarSeguro(String(f.nombre_enc), "crm.nombre");
    if (coincideNombre(contraparte, nombre)) {
      vistos.add(normalizar(nombre));
      salida.push({ nombre, origen: "cliente", id: Number(f.id), etapa: String(f.etapa ?? "") });
    }
  }
  for (const f of casos.rows) {
    const nombre = descifrarSeguro(String(f.nombre_enc), "solicitud.nombre");
    if (!vistos.has(normalizar(nombre)) && coincideNombre(contraparte, nombre)) {
      salida.push({ nombre, origen: "caso", id: Number(f.id) });
    }
  }
  return salida.slice(0, 5);
}
