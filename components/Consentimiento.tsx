import type { ReactNode } from "react";

/**
 * Casilla de consentimiento con texto breve y el detalle completo a un clic.
 * Funciona sin JavaScript (usa <details>), así que sirve tanto en formularios
 * de cliente como en páginas de servidor.
 */
export function Consentimiento({
  nombre,
  corto,
  detalle,
  verTexto = "Ver qué acepto",
  marcado,
  invalido,
}: {
  nombre: string;
  corto: ReactNode;
  detalle: ReactNode;
  verTexto?: string;
  marcado?: boolean;
  invalido?: boolean;
}) {
  return (
    <div className="consent">
      <label className="opcion">
        <input type="checkbox" name={nombre} defaultChecked={marcado} aria-invalid={invalido ? true : undefined} />
        <span>{corto}</span>
      </label>
      <details className="consent-mas">
        <summary>{verTexto}</summary>
        <div className="consent-detalle">{detalle}</div>
      </details>
    </div>
  );
}
