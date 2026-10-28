import { normalizarConsulta, raices } from "./normas";
import type { MateriaClave } from "./materias";

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

const SEÑALES_RELATO: Record<string, { palabras: string; fuertes: string }> = {
  laboral: {
    palabras: "trabajo trabajador trabajadora empleador jefe despido despidieron despedido echaron finiquito sueldo salario remuneración remuneraciones cotización cotizaciones liquidación previsional sindicato jornada horas extras vacaciones licencia",
    fuertes: "despido despidieron despedido echaron finiquito remuneración cotizaciones",
  },
  familia: {
    palabras: "pensión alimentos alimenticia hijo hija hijos divorcio divorciarme separación matrimonio visitas cuidado personal tuición adopción violencia intrafamiliar pareja",
    fuertes: "alimentos divorcio divorciarme pensión tuición",
  },
  civil: {
    palabras: "deuda deudas pagar pagué contrato incumplimiento herencia sucesión propiedad vecino indemnización pagaré prescripción préstamo",
    fuertes: "herencia prescripción pagaré incumplimiento",
  },
  penal: {
    palabras: "estafa estafaron robo robaron hurto golpearon amenazaron delito denuncia querella fiscalía detenido detención fraude",
    fuertes: "estafa estafaron robo robaron delito",
  },
  consumidor: {
    palabras: "producto servicio compra compré tienda proveedor garantía garantía sernac devolución devolución publicidad banco tarjeta cobro",
    fuertes: "sernac garantía producto",
  },
  arriendo: {
    palabras: "arriendo arrendador arrendatario arrendar arriendo arrendamiento renta alquiler desalojo desalojar arrendamiento vivienda departamento garantía",
    fuertes: "arriendo arrendador arrendatario desalojo arrendamiento",
  },
};

const SEÑALES_NORMALIZADAS = Object.fromEntries(
  Object.entries(SEÑALES_RELATO).map(([materia, señales]) => [
    materia,
    {
      palabras: new Set(raices(normalizarConsulta(señales.palabras))),
      fuertes: new Set(raices(normalizarConsulta(señales.fuertes))),
    },
  ]),
);

/** Infiera el área jurídica solo cuando el relato contiene indicios suficientes; null significa que debe buscarse sin filtro. */
export function detectarMateriaRelato(texto: string): MateriaClave | null {
  const palabras = new Set(raices(normalizarConsulta(texto)));
  const puntajes = Object.entries(SEÑALES_NORMALIZADAS)
    .map(([materia, señales]) => {
      let puntaje = 0;
      for (const palabra of señales.palabras) {
        if (palabras.has(palabra)) puntaje += señales.fuertes.has(palabra) ? 3 : 1;
      }
      return { materia, puntaje };
    })
    .sort((a, b) => b.puntaje - a.puntaje);
  const [mejor, segundo] = puntajes;
  return mejor.puntaje >= 3 && mejor.puntaje >= (segundo?.puntaje ?? 0) + 2
    ? mejor.materia as MateriaClave
    : null;
}

/** Nombre legible a partir del nombre de archivo: «ley_19496-consumidor.pdf» → «Ley 19496 consumidor». */
export function nombreDeArchivo(archivo: string): string {
  const base = archivo.replace(/\.[^.]+$/, "").replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();
  return (base.charAt(0).toUpperCase() + base.slice(1)).slice(0, 200) || "Documento";
}
