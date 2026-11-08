import Link from "next/link";

/** Seis barras con los colores de la marca. Sobre fondo oscuro, la barra pizarra pasa a blanco. */
const BARRAS = [
  { ancho: 6, color: "#88584E" },
  { ancho: 6, color: "#E4CFBB" },
  { ancho: 6, color: "#71959F" },
  { ancho: 4, color: "#C78178" },
  { ancho: 7, color: "#FFDE59" },
  { ancho: 8, color: "#3B4848" },
];

/** Logo de Neife con estante de libros (fondo transparente, proporción 3,2:1). */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label="Neife, ir al inicio">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-neife.png" alt="" width={720} height={224} className="logo-img" decoding="async" />
    </Link>
  );
}

/** Composición de la portada: las mismas seis barras de la paleta, a gran escala. */
const ALTOS = [66, 86, 74, 96, 80, 100];
const ANCHOS = [161, 161, 157, 115, 202, 229];

export function BarrasPortada() {
  return (
    <div className="barras" aria-hidden="true">
      {BARRAS.map((b, i) => (
        <span key={i} className="barra" style={{ background: b.color, flex: ANCHOS[i], height: `${ALTOS[i]}%` }} />
      ))}
    </div>
  );
}
