import Link from "next/link";
import type { Conflicto } from "@/lib/conflictos";

/** Aviso de posible conflicto de interés. Sin coincidencias, confirma que se revisó. */
export function AlertaConflicto({ conflictos }: { conflictos: Conflicto[] }) {
  if (conflictos.length === 0) {
    return <p className="bj-conflicto bj-conflicto-ok">Sin coincidencias con tus clientes ni tus casos.</p>;
  }
  return (
    <div className="bj-conflicto bj-conflicto-alerta" role="alert">
      <strong>Posible conflicto de interés</strong>
      <p>La otra parte se parece a alguien que ya atiendes. Revísalo antes de aceptar.</p>
      <ul>
        {conflictos.map((c) => (
          <li key={`${c.origen}-${c.id}`}>
            {c.origen === "cliente" ? <Link href={`/panel/crm/clientes/${c.id}`}>{c.nombre}</Link> : <Link href={`/panel/solicitudes/${c.id}`}>{c.nombre}</Link>}
            <span> · {c.origen === "cliente" ? "cliente" : "caso tuyo"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
