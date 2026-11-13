import { Resend } from "resend";
import { urlSitio } from "./sitio";

/**
 * Envío de correos con Resend.
 * Sin RESEND_API_KEY los correos de prueba se muestran en consola; códigos y enlaces de acceso se ocultan.
 * Los correos no llevan el relato del caso: solo avisan y traen un enlace.
 */

const NOMBRE = "Neife";

function remitente(): string {
  return process.env.EMAIL_FROM || `${NOMBRE} <onboarding@resend.dev>`;
}

export async function enviarCorreo(p: { para: string; asunto: string; texto: string; html?: string; sensible?: boolean }): Promise<boolean> {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) {
    const detalle = p.sensible ? "" : `\n${p.texto}`;
    console.log(`\n[correo no enviado: falta RESEND_API_KEY]\nPara: ${p.para}\nAsunto: ${p.asunto}${detalle}\n`);
    return false;
  }
  try {
    const r = await new Resend(clave).emails.send({
      from: remitente(),
      to: p.para,
      subject: p.asunto,
      text: p.texto,
      html: p.html ?? plantilla(p.asunto, p.texto),
    });
    if (r.error) {
      console.error("Resend:", r.error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Resend:", e instanceof Error ? e.message : e);
    return false;
  }
}

function escapar(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** HTML simple y sobrio. Los enlaces sueltos se vuelven botones discretos. */
function plantilla(asunto: string, texto: string): string {
  const cuerpo = escapar(texto)
    .split("\n\n")
    .map((p) =>
      p.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" style="color:#3B4848;font-weight:600">$1</a>').replace(/\n/g, "<br>"),
    )
    .map((p) => `<p style="margin:0 0 14px;line-height:1.55">${p}</p>`)
    .join("");
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f6efe6;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#3B4848">
<div style="max-width:520px;margin:0 auto;background:#fff;border-top:4px solid #88584E;padding:28px">
<p style="margin:0 0 18px;font-weight:700;color:#88584E">${NOMBRE}</p>${cuerpo}
<p style="margin:22px 0 0;font-size:12px;color:#71959F">${escapar(asunto)} · ${urlSitio()}</p></div></body></html>`;
}

export const correos = {
  verificarCorreo(para: string, enlace: string) {
    return enviarCorreo({
      para,
      asunto: "Confirma tu correo para activar tu cuenta",
      texto: `Para terminar de crear tu cuenta de Neife, confirma tu correo con este enlace:\n${enlace}\n\nSi no creaste esta cuenta, ignora este mensaje.`,
      sensible: true,
    });
  },
  codigoIngreso(para: string, codigo: string) {
    return enviarCorreo({
      para,
      asunto: "Tu código para ingresar a Neife",
      texto: `Usa este código para ingresar: ${codigo}\n\nVence en 10 minutos y solo se puede usar una vez. Si no pediste este código, ignora este mensaje.`,
      sensible: true,
    });
  },
  recuperar(para: string, enlace: string) {
    return enviarCorreo({
      para,
      asunto: "Recupera tu contraseña",
      texto: `Pediste cambiar tu contraseña.\n\nUsa este enlace, vale por 1 hora:\n${enlace}\n\nSi no fuiste tú, ignora este correo: tu cuenta sigue igual.`,
      sensible: true,
    });
  },
  nuevaSolicitud(para: string, materia: string, enlace: string) {
    return enviarCorreo({
      para,
      asunto: `Nueva solicitud: ${materia}`,
      texto: `Llegó una solicitud nueva de ${materia}.\n\nResponde pronto: el primer contacto es lo que más pesa para cerrar.\n${enlace}`,
    });
  },
  confirmacion(para: string, enlace: string, abierta = false) {
    return enviarCorreo({
      para,
      asunto: "Recibimos tu solicitud",
      texto: `${abierta ? "Tu solicitud quedó disponible en la bandeja para que la tome un asesor." : "Tu solicitud llegó al asesor."} Te contactará por este medio o por teléfono.\n\nSigue el avance aquí, sin necesidad de cuenta:\n${enlace}\n\nGuarda este enlace: es la única forma de volver a ver tu caso.`,
    });
  },
  avance(para: string, texto: string, enlace: string) {
    return enviarCorreo({
      para,
      asunto: "Novedades de tu solicitud",
      texto: `${texto}\n\nMira el avance completo aquí:\n${enlace}`,
    });
  },
  informeListo(para: string, nombreAsesor: string, enlace: string) {
    return enviarCorreo({
      para,
      asunto: "Tu informe está listo",
      texto: `${nombreAsesor} dejó listo tu informe.\n\nPuedes verlo y descargarlo en PDF aquí:\n${enlace}`,
    });
  },
  recordatorio(para: string, resumen: string, enlace: string) {
    return enviarCorreo({
      para,
      asunto: "Contactos pendientes de hoy",
      texto: `${resumen}\n\nAbre tu panel:\n${enlace}`,
    });
  },
  casoAbierto(para: string, resumen: string, enlace: string) {
    return enviarCorreo({
      para,
      asunto: "Nueva solicitud disponible en la bandeja",
      texto: `Llegó una solicitud que coincide con tus avisos:\n\n${resumen}\n\nLéela y decide si la tomas:\n${enlace}\n\nCambia qué avisos recibes en Mi perfil.`,
    });
  },
  horaReservada(para: string, cuando: string, enlace: string) {
    return enviarCorreo({
      para,
      asunto: "Una persona reservó una hora contigo",
      texto: `Una persona de tus casos reservó una hora: ${cuando}.\n\nLa ves en tu agenda:\n${enlace}`,
    });
  },
};
