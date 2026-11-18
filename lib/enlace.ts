import QRCode from "qrcode";
import { urlSitio } from "./sitio";

/** Enlace personal del asesor: lleva a su ficha y desde ahí al formulario, marcando el origen. */
export function enlacePersonal(slug: string): string {
  return `${urlSitio()}/a/${slug}`;
}

/** QR en SVG, generado en el servidor. */
export async function qrSvg(texto: string): Promise<string> {
  return QRCode.toString(texto, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#2b3436", light: "#ffffff" } });
}
