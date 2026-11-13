/**
 * Guías gratuitas y modelos de cartas. Son orientación general y deben revisarse cuando cambien las leyes.
 */
export type CampoCarta = { nombre: string; etiqueta: string; ayuda?: string; largo?: boolean; opcional?: boolean };

export type Carta = {
  clave: "laboral" | "consumidor" | "arriendo";
  titulo: string;
  destinatario: string;
  asunto: string;
  campos: CampoCarta[];
  cuerpo: (valores: Record<string, string>) => string[];
};

export type Guia = {
  materia: string;
  titulo: string;
  bajada: string;
  pasos: { titulo: string; texto: string }[];
  plazos: string[];
  documentos: string[];
  normas: string[];
  carta?: Carta;
};

export const GUIAS: Record<string, Guia> = {
  laboral: {
    materia: "laboral",
    titulo: "Me despidieron o no me pagan: qué hacer",
    bajada: "Pasos, plazos y documentos para reclamar por un despido, un finiquito pendiente o cotizaciones impagas.",
    pasos: [
      { titulo: "Pide y guarda la carta de aviso", texto: "El despido debe comunicarse por escrito, con la causal y los hechos en que se funda. Si no te la entregaron, anótalo con fecha." },
      { titulo: "Revisa el finiquito antes de firmar", texto: "El finiquito debe constar por escrito y ratificarse ante un ministro de fe. Puedes firmarlo con reserva de derechos si no estás de acuerdo con algún concepto." },
      { titulo: "Revisa tus cotizaciones", texto: "Pide los certificados de cotizaciones de AFP y AFC. Si hay cotizaciones impagas, consulta pronto si se cumplen los requisitos para reclamar la nulidad del despido." },
      { titulo: "Consulta en la Inspección del Trabajo", texto: "Puedes presentar un reclamo administrativo. Este puede suspender el plazo para demandar, sujeto a los límites legales." },
      { titulo: "Busca asesoría a tiempo", texto: "Las acciones laborales tienen plazos breves. Un abogado o la Corporación de Asistencia Judicial pueden orientarte." },
    ],
    plazos: ["Para reclamar por despido injustificado, el plazo general es de 60 días hábiles desde la separación; un reclamo ante la Inspección del Trabajo puede suspenderlo, sin exceder el límite legal de 90 días hábiles. Confirma cómo se aplica a tu caso."],
    documentos: ["Contrato de trabajo y anexos", "Últimas liquidaciones de sueldo", "Carta de aviso de término, si existe", "Certificados de cotizaciones previsionales", "Finiquito, si te lo entregaron"],
    normas: ["Código del Trabajo, arts. 161, 162, 163, 168 y 177"],
    carta: {
      clave: "laboral",
      titulo: "Carta para pedir el finiquito y el pago de lo adeudado",
      destinatario: "empresa",
      asunto: "Solicitud de finiquito y pago de lo adeudado",
      campos: [
        { nombre: "nombre", etiqueta: "Tu nombre completo" },
        { nombre: "rut", etiqueta: "Tu RUT", opcional: true },
        { nombre: "empresa", etiqueta: "Nombre de la empresa o empleador" },
        { nombre: "fecha", etiqueta: "Fecha en que terminó tu trabajo", ayuda: "Ej.: 08-11-2026" },
        { nombre: "detalle", etiqueta: "Qué te deben", ayuda: "Ej.: finiquito, indemnización, vacaciones, horas extra, cotizaciones.", largo: true },
      ],
      cuerpo: (v) => [
        `Por medio de la presente, yo, ${v.nombre}${v.rut ? `, RUT ${v.rut}` : ""}, quien prestó servicios para ${v.empresa} hasta el ${v.fecha}, solicito el pago de lo que se me adeuda: ${v.detalle}.`,
        "Solicito además que se me entregue el finiquito por escrito, con el detalle de cada concepto, y que se acrediten los pagos de cotizaciones previsionales y de seguridad social a la fecha de término.",
        "Dejo constancia de que, si no recibo respuesta dentro de un plazo razonable, acudiré a la Inspección del Trabajo y a los tribunales competentes para hacer valer mis derechos.",
      ],
    },
  },
  consumidor: {
    materia: "consumidor",
    titulo: "Compré algo y no responden: qué hacer",
    bajada: "Cómo reclamar cuando un producto falla o un servicio no se cumple, y qué plazos revisar.",
    pasos: [
      { titulo: "Reúne la prueba", texto: "Boleta o factura, correos, capturas, fotos y cualquier publicidad que prometiera algo distinto." },
      { titulo: "Reclama por escrito al proveedor", texto: "Pide una solución concreta —reparación, cambio o devolución— y guarda el comprobante de envío." },
      { titulo: "Si no responde, reclama en el SERNAC", texto: "Puedes presentar un reclamo en línea. El SERNAC lo envía a la empresa; reclamar allí no reemplaza necesariamente una acción judicial." },
      { titulo: "Evalúa otras acciones", texto: "Si no hay solución, consulta si corresponde denunciar o demandar ante el Juzgado de Policía Local." },
    ],
    plazos: ["La garantía legal para productos nuevos con fallas es, por regla general, de seis meses desde la recepción. Los plazos para acciones judiciales dependen del tipo de reclamo; pide orientación pronto."],
    documentos: ["Boleta, factura o comprobante de pago", "Correos y mensajes con la empresa", "Fotos o videos del problema", "Garantía o publicidad del producto"],
    normas: ["Ley 19.496 sobre Protección de los Derechos de los Consumidores, arts. 20, 21 y 26"],
    carta: {
      clave: "consumidor",
      titulo: "Carta de reclamo al proveedor",
      destinatario: "empresa",
      asunto: "Reclamo por producto o servicio defectuoso",
      campos: [
        { nombre: "nombre", etiqueta: "Tu nombre completo" },
        { nombre: "rut", etiqueta: "Tu RUT", opcional: true },
        { nombre: "empresa", etiqueta: "Nombre de la empresa o tienda" },
        { nombre: "producto", etiqueta: "Producto o servicio" },
        { nombre: "fecha", etiqueta: "Fecha de compra", ayuda: "Ej.: 15-09-2026" },
        { nombre: "problema", etiqueta: "Qué pasó", largo: true },
        { nombre: "peticion", etiqueta: "Qué solución pides", ayuda: "Ej.: cambio del producto, devolución del dinero o reparación gratuita." },
      ],
      cuerpo: (v) => [
        `Yo, ${v.nombre}${v.rut ? `, RUT ${v.rut}` : ""}, adquirí con fecha ${v.fecha} el siguiente producto o servicio: ${v.producto}.`,
        `El problema es el siguiente: ${v.problema}`,
        `En virtud de los derechos que me reconoce la Ley 19.496 sobre Protección de los Derechos de los Consumidores, solicito: ${v.peticion}.`,
        "Quedo atento a su respuesta por escrito. De no obtener una solución, presentaré el reclamo ante el SERNAC y consultaré las acciones que correspondan.",
      ],
    },
  },
  arriendo: {
    materia: "arriendo",
    titulo: "Problemas con un arriendo: qué hacer",
    bajada: "Garantía, aumentos de arriendo y término del contrato: pasos iniciales para revisar tu situación.",
    pasos: [
      { titulo: "Lee tu contrato", texto: "Revisa plazo, monto, reajuste, causales de término y garantía. Guarda también comprobantes y anexos." },
      { titulo: "Responde por escrito", texto: "Si el dueño te pide algo —subir el arriendo o dejar el inmueble— pide que lo comunique por escrito y responde por el mismo medio." },
      { titulo: "No entregues el inmueble sin dejar constancia", texto: "Si acuerdas la entrega, documenta el estado del inmueble, las lecturas de servicios y la entrega de llaves." },
      { titulo: "Busca asesoría si recibes una demanda", texto: "Los plazos judiciales pueden ser breves. Consulta de inmediato con un abogado o la Corporación de Asistencia Judicial." },
    ],
    plazos: ["Los plazos dependen del contrato, de la causal invocada y del procedimiento aplicable. Si recibes una demanda o carta de término, revísala pronto con un asesor."],
    documentos: ["Contrato de arriendo", "Comprobantes de pago de arriendo y garantía", "Correos o mensajes con el dueño o corredor", "Fotos del estado del inmueble"],
    normas: ["Ley 18.101 sobre arrendamiento de predios urbanos", "Código Civil, normas sobre arrendamiento"],
    carta: {
      clave: "arriendo",
      titulo: "Carta para pedir la devolución de la garantía",
      destinatario: "arrendador",
      asunto: "Solicitud de devolución de garantía de arriendo",
      campos: [
        { nombre: "nombre", etiqueta: "Tu nombre completo" },
        { nombre: "rut", etiqueta: "Tu RUT", opcional: true },
        { nombre: "arrendador", etiqueta: "Nombre del arrendador o corredora" },
        { nombre: "direccion", etiqueta: "Dirección del inmueble" },
        { nombre: "fecha", etiqueta: "Fecha en que entregaste el inmueble", ayuda: "Ej.: 30-10-2026" },
        { nombre: "monto", etiqueta: "Monto de la garantía", ayuda: "Ej.: $450.000" },
      ],
      cuerpo: (v) => [
        `Yo, ${v.nombre}${v.rut ? `, RUT ${v.rut}` : ""}, arrendatario del inmueble ubicado en ${v.direccion}, hice entrega del mismo con fecha ${v.fecha}.`,
        `Al inicio del contrato entregué una garantía de ${v.monto}. Solicito su devolución, descontando únicamente deudas o daños que se acrediten con documentos.`,
        "Pido que me informe por escrito si hará algún descuento, con el detalle y los respaldos. De no recibir respuesta, ejerceré las acciones legales que correspondan.",
      ],
    },
  },
  familia: {
    materia: "familia",
    titulo: "Pensión de alimentos: pasos iniciales",
    bajada: "Qué documentos reunir, cómo empezar y dónde buscar orientación si no pagan.",
    pasos: [
      { titulo: "Reúne los antecedentes", texto: "Busca certificados de nacimiento, datos de domicilio y trabajo de la otra parte, y documentos de los gastos de los niños." },
      { titulo: "Consulta por la mediación", texto: "En muchos casos se debe intentar mediación antes de demandar. Puedes pedir orientación en la Corporación de Asistencia Judicial." },
      { titulo: "Si no pagan, informa al tribunal", texto: "Guarda comprobantes de pagos y deudas, y consulta al tribunal o a un abogado sobre el procedimiento de cobro que corresponde." },
      { titulo: "Guarda tus comprobantes", texto: "Los pagos recibidos y los gastos de los hijos pueden servir como antecedentes para revisar o cobrar una pensión." },
    ],
    plazos: ["Los plazos y requisitos dependen de si se trata de fijar, modificar o cobrar alimentos. Pide orientación jurídica para tu caso."],
    documentos: ["Certificado de nacimiento de los hijos", "Datos de domicilio y trabajo de la otra parte", "Boletas de gastos de los hijos", "Resolución del tribunal, si ya hay una pensión fijada"],
    normas: ["Ley 14.908 sobre abandono de familia y pago de pensiones alimenticias"],
  },
};

export function guiaDe(materia: string): Guia | null {
  return Object.prototype.hasOwnProperty.call(GUIAS, materia) ? GUIAS[materia] : null;
}
