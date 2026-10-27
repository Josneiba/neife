import { raices } from "./normas";

/**
 * Adivina la materia de un documento por sus palabras. Es una ayuda para el administrador:
 * siempre puede corregirla después. Si no hay señal clara devuelve «otra».
 */
const CLAVES: Record<string, string> = {
  laboral: "trabajo trabajador empleador despido remuneracion finiquito sindicato contrato cotizacion previsional jornada feriado laboral",
  familia: "familia alimentos hijo matrimonio divorcio filiacion cuidado personal parental adopcion violencia intrafamiliar menor pension",
  consumidor: "consumidor proveedor garantia producto servicio publicidad sernac boleta reclamo comercio",
  arriendo: "arrendamiento arrendador arrendatario arriendo renta vivienda desahucio garantia inmueble",
  penal: "delito pena penal fiscal imputado querella prision detencion cautelar crimen",
  civil: "obligacion contrato propiedad sucesion herencia dominio prescripcion responsabilidad indemnizacion deuda pagare",
};
const INDICE = Object.fromEntries(Object.entries(CLAVES).map(([m, t]) => [m, new Set(raices(t))]));

export function detectarMateria(texto: string, nombre = ""): string {
  const muestra = `${nombre} ${nombre} ${nombre} ${texto.slice(0, 40_000)}`;
  const cuenta = new Map<string, number>();
  for (const r of raices(muestra)) cuenta.set(r, (cuenta.get(r) ?? 0) + 1);
  let mejor = "otra";
  let puntaje = 0;
  let segundo = 0;
  for (const [m, claves] of Object.entries(INDICE)) {
    let p = 0;
    for (const c of claves) p += Math.min(cuenta.get(c) ?? 0, 25);
    if (p > puntaje) {
      segundo = puntaje;
      puntaje = p;
      mejor = m;
    } else if (p > segundo) segundo = p;
  }
  // Exige una señal mínima y que gane con holgura.
  return puntaje >= 6 && puntaje >= segundo * 1.25 ? mejor : "otra";
}

/** Nombre legible a partir del nombre de archivo: «ley_19496-consumidor.pdf» → «Ley 19496 consumidor». */
export function nombreDeArchivo(archivo: string): string {
  const base = archivo.replace(/\.[^.]+$/, "").replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();
  return (base.charAt(0).toUpperCase() + base.slice(1)).slice(0, 200) || "Documento";
}
