/**
 * Verificación de asesores. El administrador revisa cada cuenta antes de activarla.
 * El título de abogado lo otorga la Corte Suprema; el certificado trae un código que cualquiera
 * puede comprobar en el sitio del Poder Judicial. Si cambia la dirección, se corrige aquí.
 */
export const CONDICIONES = ["Abogado/a", "Egresado/a de Derecho", "Estudiante de Derecho"] as const;
export type Condicion = (typeof CONDICIONES)[number];

export const URL_VERIFICAR_TITULO = "https://verificadoc.pjud.cl";
export const URL_INFO_TITULOS = "https://www.pjud.cl/servicios/oficina-titulos";

export function esAbogado(titulo: string): boolean {
  return /^abogad/i.test(titulo.trim());
}

/** Lo que el admin debe tener a la vista al decidir. */
export function datoAVerificar(titulo: string): string {
  return esAbogado(titulo) ? "Código del certificado de título" : "Universidad y año";
}
