export const MATERIAS = [
  { clave: "laboral", nombre: "Laboral" },
  { clave: "familia", nombre: "Familia" },
  { clave: "civil", nombre: "Civil" },
  { clave: "penal", nombre: "Penal" },
  { clave: "consumidor", nombre: "Consumidor" },
  { clave: "arriendo", nombre: "Arriendos" },
  { clave: "otra", nombre: "Otra o no sé" },
] as const;

export type MateriaClave = (typeof MATERIAS)[number]["clave"];

export function nombreMateria(clave: string): string {
  return MATERIAS.find((m) => m.clave === clave)?.nombre ?? clave;
}

export function esMateria(clave: string): clave is MateriaClave {
  return MATERIAS.some((m) => m.clave === clave);
}

export const REGIONES = [
  "Arica y Parinacota",
  "Tarapacá",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaíso",
  "Metropolitana de Santiago",
  "O'Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "La Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Aysén",
  "Magallanes",
] as const;

export const PRESUPUESTOS = [
  "Hasta $20.000",
  "$20.000 a $50.000",
  "$50.000 a $150.000",
  "Más de $150.000",
  "Prefiero conversarlo",
  "Busco opciones gratuitas",
] as const;

export const URGENCIAS = [
  { clave: "normal", nombre: "Sin apuro" },
  { clave: "pronto", nombre: "En las próximas semanas" },
  { clave: "urgente", nombre: "Tengo un plazo cercano" },
] as const;

export function nombreUrgencia(clave: string): string {
  return URGENCIAS.find((u) => u.clave === clave)?.nombre ?? clave;
}

/** Qué conviene contar en el relato, según la materia. */
export const GUIA_RELATO: Record<MateriaClave, string> = {
  laboral: "Cargo, desde cuándo trabajas, si hay contrato, qué ocurrió (despido, deuda, accidente) y la fecha.",
  familia: "Quiénes intervienen (sin nombres completos), edades de los hijos si los hay y qué necesitas resolver.",
  civil: "Qué se acordó, qué incumplió la otra parte, montos aproximados y fechas.",
  penal: "Qué ocurrió, cuándo, si hay denuncia y si existe alguna citación.",
  consumidor: "Qué compraste o contrataste, a quién, cuánto pagaste, qué falló y si reclamaste.",
  arriendo: "Si eres arrendador o arrendatario, valor del arriendo, desde cuándo y qué conflicto hay.",
  otra: "Qué pasó, cuándo y qué quisieras lograr.",
};

export type Plantilla = {
  /** Datos que hay que confirmar con la persona para abrir el caso. */
  datos: string[];
  documentos: string[];
  /** Derechos que suelen estar en juego. El abogado los confirma. */
  derechos: string[];
  /** Instancia u organismo habitual y trámite previo. */
  vias: string;
  /** Plazos habituales. Siempre se verifican con la norma vigente. */
  plazos: string;
  preguntas: string[];
};

const PREGUNTA_HONORARIOS = "¿Cuáles son los honorarios y cómo se pagan?";

/**
 * Punto de partida de la ficha de cada materia. Resume cómo suele abordarse un caso en Chile.
 * Es orientación: un abogado debe verificar normas, plazos y vías antes de actuar.
 */
export const PLANTILLAS: Record<MateriaClave, Plantilla> = {
  laboral: {
    datos: [
      "Nombre y RUT del empleador (razón social)",
      "Fecha de inicio y de término de la relación laboral",
      "Remuneración mensual y tipo de contrato",
      "Causal invocada por el empleador, si la hubo",
    ],
    documentos: [
      "Contrato de trabajo y anexos",
      "Últimas liquidaciones de sueldo",
      "Carta de aviso de término o finiquito, si existe",
      "Certificado de cotizaciones previsionales",
    ],
    derechos: [
      "Recibir carta de aviso con la causal y los hechos en que se funda",
      "Tener las cotizaciones previsionales al día al momento del término",
      "Recibir finiquito por escrito, con pago de feriado proporcional y demás haberes",
      "Reclamar judicialmente si el despido fue injustificado, indebido o improcedente",
    ],
    vias:
      "Inspección del Trabajo (comparendo de conciliación) y Juzgado de Letras del Trabajo del lugar donde se prestaron los servicios. Defensoría Laboral de la Corporación de Asistencia Judicial para quienes cumplan los requisitos.",
    plazos:
      "Reclamo por despido: 60 días hábiles desde la separación (Código del Trabajo, art. 168). Suele suspenderse si se reclama ante la Inspección del Trabajo. Verificar el cómputo exacto.",
    preguntas: [
      "¿Qué plazos corren y desde cuándo?",
      "¿Conviene reclamar primero en la Inspección del Trabajo o ir directo a tribunales?",
      "¿Qué documentos faltan para respaldar los hechos?",
      PREGUNTA_HONORARIOS,
    ],
  },
  familia: {
    datos: [
      "Nombre, edad y RUT de los hijos",
      "Domicilio de ambas partes y del niño o niña",
      "Ingresos aproximados de quien debe pagar y de quien cuida",
      "Si existe una resolución o acuerdo anterior",
    ],
    documentos: [
      "Certificados de nacimiento y de matrimonio, según corresponda",
      "Comprobantes de ingresos y gastos del hogar",
      "Resoluciones o acuerdos anteriores, si los hay",
      "Comprobantes de pagos o aportes realizados",
    ],
    derechos: [
      "Los hijos tienen derecho a alimentos: sustento, habitación, vestuario, salud y educación",
      "La demanda de alimentos puede presentarse sin abogado en el tribunal de familia",
      "Ante el no pago, la ley contempla medidas de apremio y retención de la devolución de impuestos",
      "Derecho a relación directa y regular con los hijos de quien no tiene el cuidado personal",
    ],
    vias:
      "Tribunal de Familia del domicilio del niño, niña o adolescente. Suele exigirse mediación familiar previa (Ley 19.968, art. 106), con excepciones. Corporación de Asistencia Judicial para patrocinio gratuito.",
    plazos:
      "El cobro de pensiones adeudadas y el cumplimiento tienen reglas propias. Confirmar prescripción y si la mediación previa es obligatoria en el caso concreto.",
    preguntas: [
      "¿Qué tribunal corresponde y hay mediación previa obligatoria?",
      "¿Qué medidas se pueden pedir mientras dura el proceso?",
      "¿Qué se puede hacer por las pensiones ya adeudadas?",
      PREGUNTA_HONORARIOS,
    ],
  },
  civil: {
    datos: [
      "Identificación de la otra parte",
      "Monto o bien en disputa",
      "Fecha en que ocurrieron los hechos",
      "Si ya hubo reclamos o negociaciones",
    ],
    documentos: [
      "Contratos, pagarés o documentos firmados",
      "Comprobantes de pago o transferencias",
      "Correos y mensajes con la otra parte",
    ],
    derechos: [
      "Exigir el cumplimiento de lo pactado o su resolución, con indemnización de perjuicios",
      "Que los contratos se cumplan de buena fe",
      "Acudir a un juicio ejecutivo si existe un título que lo permita",
    ],
    vias: "Juzgado de Letras en lo Civil competente. Conviene intentar antes una carta de cobro o una negociación documentada.",
    plazos: "La prescripción depende del tipo de acción. Verificar siempre antes de aconsejar esperar.",
    preguntas: [
      "¿Existe un plazo para reclamar y cuándo vence?",
      "¿Qué se puede intentar antes de ir a tribunales?",
      "¿Qué costos y tiempos se pueden esperar?",
      PREGUNTA_HONORARIOS,
    ],
  },
  penal: {
    datos: [
      "Si la persona es víctima, denunciante o imputada",
      "Fecha y lugar de los hechos",
      "Si existe denuncia, parte policial o citación",
      "Nombre del fiscal o del tribunal, si lo hay",
    ],
    documentos: [
      "Denuncia o parte policial, si existe",
      "Citaciones o notificaciones recibidas",
      "Fotografías, mensajes o grabaciones relacionadas",
    ],
    derechos: [
      "Toda persona imputada tiene derecho a defensa, a guardar silencio y a un abogado",
      "La víctima puede denunciar y ser informada del avance de la investigación",
      "Acceso a la Defensoría Penal Pública si no se cuenta con defensor",
    ],
    vias: "Fiscalía (denuncia en Carabineros, PDI o Ministerio Público) y Juzgado de Garantía. Defensoría Penal Pública para la defensa de imputados.",
    plazos: "Las citaciones y audiencias tienen fechas fijas: confirmarlas de inmediato. Pasar a un abogado con urgencia.",
    preguntas: [
      "¿Hay plazos o audiencias próximas?",
      "¿Qué derechos tiene la persona en este momento?",
      "¿Puede acceder a defensa pública u otra opción gratuita?",
      PREGUNTA_HONORARIOS,
    ],
  },
  consumidor: {
    datos: [
      "Nombre y RUT del proveedor o empresa",
      "Fecha de la compra o del servicio",
      "Monto pagado y medio de pago",
      "Reclamos ya presentados y su respuesta",
    ],
    documentos: [
      "Boleta, factura o comprobante de compra",
      "Contrato o condiciones de servicio",
      "Reclamos hechos a la empresa y sus respuestas",
      "Fotografías o capturas del problema",
    ],
    derechos: [
      "Derecho a la reparación, cambio o devolución cuando el producto tiene fallas (Ley 19.496)",
      "Información veraz y oportuna sobre el producto o servicio",
      "Reclamar ante el SERNAC y demandar ante el Juzgado de Policía Local",
    ],
    vias: "Reclamo en el SERNAC (mediación) y denuncia o demanda ante el Juzgado de Policía Local del lugar del acto.",
    plazos: "La acción infraccional suele prescribir en 6 meses desde el hecho (Ley 19.496, art. 26). Verificar el cómputo.",
    preguntas: [
      "¿Corresponde reclamar ante el SERNAC o ir al Juzgado de Policía Local?",
      "¿Hay un plazo para reclamar y cuándo vence?",
      "¿Qué se puede pedir: reparación, cambio o devolución?",
      PREGUNTA_HONORARIOS,
    ],
  },
  arriendo: {
    datos: [
      "Si el contrato es escrito y su plazo (fijo o indefinido)",
      "Renta pactada y fecha de pago",
      "Monto de la garantía entregada",
      "Dirección del inmueble y comuna",
    ],
    documentos: [
      "Contrato de arriendo",
      "Comprobantes de pago de arriendo y gastos comunes",
      "Cartas o avisos intercambiados con la otra parte",
      "Inventario o fotografías del inmueble",
    ],
    derechos: [
      "El arrendador no puede cortar servicios básicos ni sacar a la fuerza al arrendatario sin orden judicial",
      "Mantener la vivienda en estado de servir para el uso pactado (reparaciones necesarias)",
      "Restitución de la garantía al término, descontados los daños acreditados",
      "La renta solo se reajusta en la forma pactada",
    ],
    vias: "Juzgado de Letras competente, bajo la Ley 18.101 y sus modificaciones (Ley 21.461). Conviene dejar constancia escrita de los reclamos antes.",
    plazos: "Los avisos de término y los plazos de pago dependen del contrato y de la ley vigente. Verificar antes de responder cualquier aviso.",
    preguntas: [
      "¿Qué plazos de aviso o de pago aplican?",
      "¿Qué pasa con la garantía?",
      "¿Qué se puede hacer antes de llegar a juicio?",
      PREGUNTA_HONORARIOS,
    ],
  },
  otra: {
    datos: [
      "Identificación de las partes involucradas",
      "Fechas relevantes",
      "Qué resultado busca la persona",
    ],
    documentos: [
      "Cualquier documento firmado relacionado con el caso",
      "Mensajes, correos o comprobantes relevantes",
    ],
    derechos: [],
    vias: "",
    plazos: "",
    preguntas: [
      "¿Qué rama del derecho corresponde a esta situación?",
      "¿Existe un plazo para actuar?",
      PREGUNTA_HONORARIOS,
    ],
  },
};

const ORIGENES: Record<string, string> = { web: "Formulario web", whatsapp: "WhatsApp", llamada: "Llamada", referido: "Referido", otro: "Otro" };
export function nombreOrigen(clave: string): string {
  return ORIGENES[clave] ?? clave;
}
