/** Textos de ayuda del CRM: ideas para conseguir clientes, plantillas de mensajes y guía de primera asesoría. */

export const CONSEJOS = [
  { t: "Una charla informativa gratuita", c: "Una charla de 30 minutos en una junta de vecinos, sindicato o centro de padres sobre un tema concreto (finiquito, pensión de alimentos, arriendos). Ofrece orientación general y deja tu contacto profesional; no ofrezcas resultados garantizados." },
  { t: "Una clínica jurídica o jornada de orientación", c: "Participa en clínicas jurídicas de universidades, municipalidades o corporaciones de asistencia. Son personas que ya buscan ayuda y conocen cómo funciona una orientación." },
  { t: "Una alianza con colegas de otras materias", c: "Si no llevas penal, ten un colega de confianza que sí. Cuando te lleguen casos de otra materia, derívalos; ellos harán lo mismo contigo. Acuerden por escrito cómo se trata cualquier compensación." },
  { t: "Contenido educativo breve", c: "Publica respuestas cortas a dudas frecuentes en tu perfil público o redes: «¿Qué es un finiquito y cuándo conviene firmarlo?». Educar genera confianza. Evita casos reales identificables." },
  { t: "Pide recomendaciones a clientes conformes", c: "Cuando un cliente quede satisfecho, pregúntale si conoce a alguien que pueda necesitar orientación. Es el origen de clientes más sólido. Está permitido pedirlo; no está permitido pagar por captar clientes." },
  { t: "Responde rápido a quien te escribe", c: "Contestar el mismo día a las solicitudes de tu perfil público marca la diferencia. Usa las plantillas de mensajes para no empezar de cero." },
] as const;

export const AVISO_ETICA =
  "Revisa las normas de publicidad y captación de clientes del Código de Ética Profesional del Colegio de Abogados y la ley vigente. Escribe solo a quien te contactó, te fue recomendado o aceptó recibir mensajes.";

export type PlantillaMensaje = { clave: string; titulo: string; cuando: string; texto: string };

/** Variables: [nombre] del cliente, [abogado] tu nombre, [fecha] y [hora] a completar. */
export const PLANTILLAS: PlantillaMensaje[] = [
  { clave: "primer_contacto", titulo: "Primer contacto", cuando: "Persona que te escribió o te recomendaron.", texto: "Hola [nombre], gracias por escribirme. Soy [abogado]. Leí lo que me cuentas y te puedo orientar. ¿Te acomoda que conversemos el [fecha] a las [hora], por teléfono o videollamada?" },
  { clave: "recordatorio", titulo: "Recordatorio de cita", cuando: "El día antes de una asesoría, reunión o audiencia.", texto: "Hola [nombre], te recuerdo que nos vemos el [fecha] a las [hora]. Si puedes, ten a mano los documentos que te pedí (contrato, comprobantes, mensajes). Si algo cambia, avísame." },
  { clave: "seguimiento", titulo: "Seguimiento si no responde", cuando: "Cliente sin movimiento hace una semana o más.", texto: "Hola [nombre], quería saber cómo sigue tu situación. Si todavía quieres revisarla, aquí estoy. Si ya la resolviste, me alegra y no te escribiré más por este tema." },
  { clave: "despues_asesoria", titulo: "Después de una asesoría", cuando: "Al terminar, para dejar acordado el siguiente paso.", texto: "Gracias por la conversación, [nombre]. Quedamos en revisar los documentos pendientes para el [fecha]. Cualquier duda me escribes. — [abogado]" },
  { clave: "documentos", titulo: "Pedir documentos", cuando: "Cuando faltan antecedentes para avanzar.", texto: "Hola [nombre], para avanzar con tu caso necesito que me envíes los documentos pendientes antes del [fecha]. Puedes mandarme una foto clara por aquí. Gracias." },
  { clave: "opinion", titulo: "Pedir opinión", cuando: "Después de cerrar una asesoría o caso.", texto: "Hola [nombre], me alegra haberte podido orientar. ¿Cómo te sentiste con la asesoría? Tu opinión me ayuda a mejorar. Y si conoces a alguien que pueda necesitar orientación legal, puedes darle mi contacto. — [abogado]" },
  { clave: "derivacion", titulo: "Avisar una derivación", cuando: "Antes de conectar al cliente con un colega (con su autorización).", texto: "Hola [nombre], por la materia de tu caso creo que lo mejor es que lo lleve un colega especialista. Con tu autorización, le comparto tus datos para que te contacte. ¿Te parece bien? — [abogado]" },
];

export const GUIA_ASESORIA = [
  { fase: "Antes", pasos: ["Revisa la ficha del cliente y lo que anotaste la última vez.", "Confirma la cita el día anterior (usa la plantilla «Recordatorio»).", "Pídele que lleve contrato, comprobantes, mensajes y su cédula."] },
  { fase: "Durante", pasos: ["Preséntate con tu condición real (abogado, egresado o estudiante supervisado) y aclara que es orientación general.", "Pide el relato con sus palabras y deja que termine antes de preguntar.", "Aclara plazos: ¿hay audiencia, notificación o fecha límite cerca?", "Explica las vías posibles y lo que no puedes hacer tú.", "Si corresponde, explica honorarios y alcance antes de cualquier mandato."] },
  { fase: "Después", pasos: ["Registra la asesoría en el CRM (queda en el historial y en tus indicadores).", "Agrega los documentos y trámites pendientes en «Progreso».", "Fija la fecha de hito o el próximo contacto.", "Envía el mensaje de cierre con el siguiente paso.", "Unos días después, pregunta si quedó conforme y regístralo."] },
] as const;
