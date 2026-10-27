"use client";

import Link from "next/link";

/** Pantalla de error común: dice qué pasó en simple, qué hacer, y deja un código para pedir ayuda. */
export function PantallaError({
  error,
  reintentar,
  volver = "/",
  volverTexto = "Ir al inicio",
}: {
  error: Error & { digest?: string };
  reintentar: () => void;
  volver?: string;
  volverTexto?: string;
}) {
  const sinConexion = /fetch|network|connect|timeout/i.test(error.message);
  return (
    <div className="contenedor pagina-estrecha" role="alert">
      <h1>Algo salió mal</h1>
      <p>
        {sinConexion
          ? "Parece que se cortó la conexión. Revisa tu internet y vuelve a intentar."
          : "No pudimos mostrar esta página. No es culpa tuya y lo que ya enviaste no se perdió."}
      </p>
      <div className="botones" style={{ marginTop: 20 }}>
        <button type="button" className="btn btn-primario" onClick={reintentar}>
          Reintentar
        </button>
        <Link href={volver} className="btn btn-secundario">
          {volverTexto}
        </Link>
      </div>
      {error.digest ? <p className="ayuda" style={{ marginTop: 16 }}>Código para soporte: {error.digest}</p> : null}
    </div>
  );
}
