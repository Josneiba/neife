import { esAbogado, URL_VERIFICAR_TITULO } from "@/lib/verificacion-titulo";

function fecha(iso: string) {
  return `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}`;
}

/**
 * Sello de verificación. Muestra cuándo Neife comprobó el título y, si es abogado/a, el código del
 * certificado para que cualquiera lo revise en el Poder Judicial. El código solo se muestra tras la
 * verificación y con la autorización que la persona dio al registrarse.
 */
export function Verificacion({ titulo, verificadoEn, codigo }: { titulo: string; verificadoEn: string; codigo?: string }) {
  if (!verificadoEn) {
    return <p className="vf vf-pendiente">Título aún sin verificar</p>;
  }
  const comprobable = esAbogado(titulo) && !!codigo;
  return (
    <div className="vf">
      <p className="vf-sello">
        <span aria-hidden="true">✓</span> Título verificado por Neife el {fecha(verificadoEn)}
      </p>
      {comprobable ? (
        <p className="vf-comprobar">
          Compruébalo tú: código <code>{codigo}</code> en{" "}
          <a href={URL_VERIFICAR_TITULO} target="_blank" rel="noopener noreferrer">
            Poder Judicial ↗
          </a>
        </p>
      ) : null}
    </div>
  );
}
