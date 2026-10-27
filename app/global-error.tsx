"use client";
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es-CL">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 32, color: "#3B4848" }}>
        <h1>Algo salió mal</h1>
        <p>No pudimos cargar el sitio. Intenta de nuevo en un momento.</p>
        <button onClick={reset} style={{ padding: "10px 18px", background: "#3B4848", color: "#fff", border: 0, cursor: "pointer" }}>
          Reintentar
        </button>
        {error.digest ? <p style={{ fontSize: 13 }}>Código para soporte: {error.digest}</p> : null}
      </body>
    </html>
  );
}
