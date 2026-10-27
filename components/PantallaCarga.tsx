export function PantallaCarga({ titulo = "Cargando…" }: { titulo?: string }) {
  return (
    <div className="carga" role="status" aria-live="polite">
      <div className="barra-ind" aria-hidden="true" />
      <p className="ayuda">{titulo}</p>
      <div className="esqueleto" aria-hidden="true">
        <span style={{ width: "40%" }} />
        <span style={{ width: "100%" }} />
        <span style={{ width: "92%" }} />
        <span style={{ width: "96%" }} />
        <span style={{ width: "70%" }} />
      </div>
    </div>
  );
}
