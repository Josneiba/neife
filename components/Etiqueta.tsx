const TEXTOS: Record<string, string> = {
  nueva: "Nueva",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  entregada: "Entregada",
  cerrada: "Cerrada",
  borrador: "Borrador",
  final: "Final",
  pendiente: "En verificación",
  activo: "Verificado",
  rechazado: "Rechazado",
};

export function Etiqueta({ estado, texto }: { estado: string; texto?: string }) {
  return <span className={`etiqueta etiqueta-${estado}`}>{texto ?? TEXTOS[estado] ?? estado}</span>;
}
