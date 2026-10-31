import { crearToken } from "./tokens";
import { correos } from "./correo";
import { urlSitio } from "./sitio";

export async function enviarVerificacionCorreo(usuarioId: number, email: string): Promise<boolean> {
  const token = await crearToken(usuarioId, "verificar_correo", 24 * 60);
  return correos.verificarCorreo(email, `${urlSitio()}/verificar/${token}`);
}
