/**
 * Quita del relato datos personales que se hayan colado (RUT, correos, teléfonos).
 * Es una segunda barrera: el formulario ya le pide a la persona que no los escriba.
 */
const PATRONES: [RegExp, string][] = [
  [/\b\d{1,2}\.?\d{3}\.?\d{3}\s?-\s?[\dkK]\b/g, "[RUT omitido]"],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[correo omitido]"],
  [/(?:\+?56[\s-]?)?(?:\(?9\)?[\s-]?)\d{4}[\s-]?\d{4}\b/g, "[teléfono omitido]"],
];

export function limpiarDatosPersonales(texto: string): { texto: string; quitados: number } {
  let quitados = 0;
  let salida = texto;
  for (const [patron, reemplazo] of PATRONES) {
    salida = salida.replace(patron, () => {
      quitados += 1;
      return reemplazo;
    });
  }
  return { texto: salida, quitados };
}
