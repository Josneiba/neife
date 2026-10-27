/**
 * Textos del sitio. Los datos públicos de contacto se configuran mediante el entorno.
 */
export const SITIO = {
  nombre: "Neife",
  correoContacto: process.env.CONTACT_EMAIL?.trim() ?? "",
  telefonoContacto: process.env.CONTACT_PHONE?.trim() ?? "",
  ciudad: "Chile",
};

export const INICIO = {
  titulo: "Cuenta tu caso y conoce qué leyes de Chile pueden favorecerte",
  bajada:
    "Describe tu situación legal, revisa las normas que podrían aplicarte y, si quieres, un asesor prepara tu informe y te conecta con un abogado de la materia.",
  situaciones: [
    { materia: "laboral", texto: "Me despidieron o no me pagan" },
    { materia: "familia", texto: "Pensión de alimentos o cuidado personal" },
    { materia: "arriendo", texto: "Problemas con un arriendo" },
    { materia: "consumidor", texto: "Compré algo y no responden" },
    { materia: "civil", texto: "Deudas, contratos o cobros" },
    { materia: "penal", texto: "Denuncia o querella" },
  ],
  pasos: [
    { icono: "nota", titulo: "Cuentas tu caso", texto: "Un formulario corto, sin cuenta y sin pagar." },
    { icono: "libro", titulo: "Ves las normas", texto: "Artículos de ley chilena que se parecen a tu situación, con plazos y vías habituales." },
    { icono: "informe", titulo: "Un asesor prepara tu informe", texto: "Revisa tu caso, te pide lo que falta y arma un informe ordenado." },
    { icono: "balanza", titulo: "Te conecta con un abogado", texto: "Con tu autorización, comparte el informe con un abogado del rubro." },
  ],
  personas: {
    titulo: "Si tienes un problema legal",
    puntos: [
      "Sabes en minutos qué normas podrían respaldarte.",
      "Ves el avance de tu caso en un enlace, sin cuenta. Con cuenta, todo en un solo lugar.",
      "Recibes los avances por correo o WhatsApp.",
      "Cuando termina la asesoría, tus datos se borran, salvo que tú pidas guardarlos.",
    ],
  },
  asesores: {
    titulo: "Si eres abogado o asesor",
    puntos: [
      "Tus casos ordenados por etapa, con lo que falta en cada uno.",
      "El informe sale casi armado con lo que reunió la persona y las normas pertinentes.",
      "Registras al abogado asociado y ves cuántos clientes confirmaste en la semana.",
      "Sumas un contacto en segundos, también desde el teléfono.",
    ],
  },
  privacidad: {
    titulo: "Tus datos, en orden",
    texto:
      "Tu relato, tus datos de contacto y tu informe se guardan cifrados. Solo el asesor de tu caso puede leerlos. Al terminar la asesoría se eliminan, a menos que aceptes que los guardemos para ayudarte de nuevo. Puedes borrarlos tú mismo en cualquier momento.",
  },
};
