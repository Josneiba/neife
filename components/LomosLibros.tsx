/**
 * Lomos de libros decorativos (solo CSS/HTML, sin imágenes). Dan la sensación de biblioteca
 * de casos legales. Son puramente visuales: aria-hidden y sin interacción.
 * Los colores salen de la paleta de la marca.
 */
const COLORES = ["#88584e", "#c9ab8d", "#71959f", "#c78178", "#e8c53f", "#3b4848", "#74483f", "#436977", "#9c4a42"];

/** Generador determinista (misma salida en servidor y navegador). */
function azar(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function libros(semilla: number, cantidad: number, altoMin: number, altoRango: number) {
  const r = azar(semilla);
  return Array.from({ length: cantidad }, () => ({
    ancho: 14 + Math.floor(r() * 18),
    alto: altoMin + Math.floor(r() * altoRango),
    color: COLORES[Math.floor(r() * COLORES.length)],
  }));
}

/** Estante lateral de varias filas (portada del sitio). */
export function EstanteLateral({ lado, filas = 4 }: { lado: "izq" | "der"; filas?: number }) {
  const base = lado === "izq" ? 7 : 19;
  return (
    <div className={`estante-lateral estante-${lado}`} aria-hidden="true">
      {Array.from({ length: filas }, (_, f) => (
        <div className="estante-fila" key={f}>
          {libros(base + f * 13, 14, 84, 62).map((b, i) => (
            <span className="libro" key={i} style={{ width: b.ancho, height: b.alto, background: b.color }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Tira horizontal de lomos (encabezado de «Tu caso» y portada en el teléfono). */
export function FilaLibros({ semilla = 3, cantidad = 26, className = "" }: { semilla?: number; cantidad?: number; className?: string }) {
  return (
    <div className={`fila-libros ${className}`.trim()} aria-hidden="true">
      {libros(semilla, cantidad, 28, 20).map((b, i) => (
        <span className="libro" key={i} style={{ width: b.ancho, height: b.alto, background: b.color }} />
      ))}
    </div>
  );
}
