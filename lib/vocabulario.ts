/**
 * Del lenguaje de la gente al lenguaje de la ley. Quien cuenta su caso dice «me despidieron» o «me estafaron»;
 * las normas dicen «terminación del contrato», «fraude». Cada regla: si el relato contiene alguna palabra de la
 * izquierda, la búsqueda suma también las de la derecha (con menos peso que las palabras reales de la persona).
 * Son términos jurídicos generales, no afirmaciones sobre el caso.
 */
export type ReglaVocabulario = { si: string; agrega: string; materia?: string };
export const VOCABULARIO: ReglaVocabulario[] = [
  // Civil, familia, consumo (ampliaciones)
  { si: "defecto defectos oculto ocultos usado", agrega: "vicios redhibitorios saneamiento vendedor comprador vicio oculto", materia: "civil" },
  { si: "divorcio divorciarme divorciar separados separación", agrega: "divorcio cese convivencia unilateral mutuo acuerdo compensación económica", materia: "familia" },
  { si: "visitas visita régimen", agrega: "relación directa regular padre madre hijo cuidado personal", materia: "familia" },
  { si: "aerolínea vuelo pasaje pasajes cancelaron canceló", agrega: "transporte aéreo pasajeros sobreventa derechos consumidor reembolso", materia: "consumidor" },
  // Laboral
  { si: "sueldo sueldos remuneración remuneraciones pagan paga pagado", agrega: "remuneración pago oportuno periódico mensual incumplimiento", materia: "laboral" },
  { si: "contrato escrito boleta efectivo", agrega: "contrato escrito plazo quince días escriturar relación laboral", materia: "laboral" },
  { si: "accidente accidentado", agrega: "accidente trabajo enfermedad profesional seguro mutualidad", materia: "laboral" },
  { si: "despido despidieron despedir despedido despidió despedida echaron", agrega: "término contrato necesidades empresa aviso indemnización causal injustificado" },
  { si: "finiquito", agrega: "finiquito ratificación término contrato feriado indemnización" },
  { si: "carta aviso", agrega: "comunicación escrito aviso causal término contrato" },
  { si: "acoso acosa acosan humilla humillan grita gritan maltrato hostiga hostigamiento", agrega: "acoso laboral violencia dignidad hostigamiento autodespido incumplimiento grave obligaciones poner término contrato recurrir juzgado vulneración derechos fundamentales tutela", materia: "laboral" },
  { si: "renuncia renunciar renuncié", agrega: "renuncia voluntaria aviso término contrato" },
  { si: "discriminaron discriminación discriminado derechos fundamentales", agrega: "constitución asegura todas personas igualdad ante la ley discriminación derechos fundamentales" , materia: "otra" },
  { si: "extras extra sobretiempo", agrega: "jornada extraordinaria excede máximo legal pactada horas extraordinarias recargo" },
  { si: "gratificación gratificaciones", agrega: "gratificación legal utilidades excedentes líquidos remuneración" },
  { si: "embarazada embarazo embarazadas", agrega: "maternidad fuero laboral autorización previa juez competente término contrato desafuero descanso prenatal postnatal" },
  { si: "licencia licencias", agrega: "licencia médica enfermedad incapacidad temporal fuero laboral autorización previa juez término contrato" },
  { si: "vacaciones", agrega: "feriado anual remuneración integra" },
  { si: "sueldo sueldos pagan pagaron pagado pago", agrega: "remuneración pago oportuno mensual", materia: "laboral" },
  { si: "accidente accidentó", agrega: "accidente trabajo enfermedad profesional seguro mutual", materia: "laboral" },
  { si: "sindicato sindical", agrega: "organización sindical negociación colectiva fuero" },
  // Consumidor
  { si: "celular teléfono televisor producto producida falla fallado fallo defectuoso malo roto", agrega: "garantía legal producto reparación cambio devolución defecto proveedor", materia: "consumidor" },
  { si: "engañaron engañosa engaño publicidad oferta", agrega: "publicidad engañosa mensaje publicitario induzca error engaño infracción a sabiendas proveedor obligado respetar términos condiciones modalidades ofrecido", materia: "consumidor" },
  { si: "cobranza cobran cobrando llaman llamadas", agrega: "cobranza extrajudicial deuda consumidor", materia: "consumidor" },
  { si: "banco bancos tarjeta crédito comisión", agrega: "crédito consumo costo total comisión cláusula contrato adhesión", materia: "consumidor" },
  { si: "tienda tiendas", agrega: "proveedor boleta garantía" },
  { si: "internet online web", agrega: "comercio electrónico retracto contrato distancia", materia: "consumidor" },
  // Familia
  { si: "pensión alimentos alimenticia", agrega: "alimentos alimentante alimentario apremios deuda", materia: "familia" },
  { si: "paga pagar pagado dejó deja", agrega: "incumplimiento apremios arresto deuda", materia: "familia" },
  { si: "tuición cuidado custodia", agrega: "cuidado personal relación directa regular patria potestad hijos", materia: "familia" },
  { si: "visitas ver", agrega: "relación directa regular", materia: "familia" },
  { si: "divorcio divorciarme divorciar separación separarme", agrega: "divorcio separación compensación económica matrimonio", materia: "familia" },
  { si: "golpea golpes golpeó pega maltrata amenaza amenazas", agrega: "violencia intrafamiliar mujeres medidas protección cautelares denuncia", materia: "familia" },
  { si: "pareja marido esposo conviviente", agrega: "cónyuge conviviente violencia matrimonio" },
  // Arriendo
  { si: "pago paga pagar mora atraso atrasado", agrega: "mora renta reconvenciones terminación arrendamiento precio", materia: "arriendo" },
  { si: "garantía", agrega: "garantía restituir restitución deterioro cosa arrendada", materia: "arriendo" },
  { si: "desalojo sacar echar desalojar", agrega: "terminación arrendamiento restitución desahucio lanzamiento", materia: "arriendo" },
  { si: "arrendador dueño propietario arrendadora", agrega: "arrendador arrendatario cosa arrendada", materia: "arriendo" },
  { si: "devuelve devolver devuelva devolución devolvió", agrega: "restituir cosa arrendada estado entregada fin arrendamiento conservación buen padre familia", materia: "arriendo" },
  { si: "renta arriendo canon mensualidad", agrega: "renta arrendamiento pago mora", materia: "arriendo" },
  { si: "humedad filtraciones reparaciones reparar", agrega: "reparaciones mejoras cosa arrendada conservación", materia: "arriendo" },
  { si: "departamento casa inmueble", agrega: "bien raíz inmueble arrendamiento", materia: "arriendo" },
  // Penal
  { si: "estafa estafaron estafar engañaron", agrega: "fraude estafa engaño perjuicio", materia: "penal" },
  { si: "transfirieron transferencia cuenta clave", agrega: "informático acceso ilícito fraude tarjeta sistema", materia: "penal" },
  { si: "internet virtual hackearon hackeo", agrega: "informático sistema acceso ilícito datos", materia: "penal" },
  { si: "robo robaron asalto hurto", agrega: "robo hurto apropiación pena", materia: "penal" },
  { si: "denuncia denunciar querella", agrega: "denuncia querella víctima fiscal ministerio público", materia: "penal" },
  // Civil
  { si: "deuda deudas debo embargo embargar embargan", agrega: "deuda embargo insolvencia renegociación liquidación persona deudora", materia: "civil" },
  { si: "prescribió prescribe prescripción prescrita", agrega: "prescripción extingue acciones derechos lapso tiempo ejercido tres años ejecutivas cinco ordinarias", materia: "civil" },
  { si: "cheque protestado protesto", agrega: "cheque protesto fondos cuenta corriente", materia: "civil" },
  { si: "incumplió incumplimiento incumple", agrega: "incumplimiento contrato resolución indemnización perjuicios", materia: "civil" },
  { si: "herencia heredar testamento", agrega: "sucesión herencia asignación testamento herederos", materia: "civil" },
  // Otras
  { si: "discriminaron discriminación discriminar", agrega: "discriminación arbitraria derechos fundamentales igualdad", materia: "otra" },
  { si: "derechos fundamentales", agrega: "recurso protección garantías constitucionales igualdad", materia: "otra" },
  { si: "extranjero migrante visa", agrega: "migrantes extranjeros residencia visa expulsión", materia: "otra" },
];

/**
 * Artículos de cabecera: para algunos temas de consulta muy frecuentes, el artículo que todo abogado revisa primero.
 * Se agregan a los resultados (nunca los reemplazan) y se marcan como sugeridos por tema. Cada uno se verifica en
 * la base: si la norma no está cargada, simplemente no aparece.
 */
export const CABECERA: { si: string; materia?: string; arts: [string, string][] }[] = [
  { si: "defecto defectos oculto ocultos", materia: "civil", arts: [["Código Civil", "1857"], ["Código Civil", "1858"]] },
  { si: "divorcio divorciarme divorciar", materia: "familia", arts: [["Ley 19.947", "55"]] },
  { si: "embarazada embarazo embarazadas licencia", materia: "laboral", arts: [["Código del Trabajo", "174"]] },
  { si: "acoso humilla humillan grita gritan hostiga hostigamiento", materia: "laboral", arts: [["Código del Trabajo", "2"], ["Código del Trabajo", "171"], ["Código del Trabajo", "489"]] },
  { si: "extras extra sobretiempo gratificación gratificaciones", materia: "laboral", arts: [["Código del Trabajo", "30"], ["Código del Trabajo", "32"], ["Código del Trabajo", "47"]] },
  { si: "despido despidieron despedir despedido despidió echaron", materia: "laboral", arts: [["Código del Trabajo", "168"], ["Código del Trabajo", "162"]] },
  { si: "prescribió prescribe prescripción prescrita", materia: "civil", arts: [["Código Civil", "2514"], ["Código Civil", "2515"]] },
  { si: "garantía devuelve devolver devuelva", materia: "arriendo", arts: [["Código Civil", "1939"], ["Código Civil", "1947"]] },
  { si: "desalojo sacar echar desalojar pago paga pagar mora", materia: "arriendo", arts: [["Código Civil", "1942"], ["Código Civil", "1977"]] },
  { si: "publicidad publicitaria engañaron engañosa engaño", materia: "consumidor", arts: [["Ley 19.496", "28"], ["Ley 19.496", "12"]] },
  { si: "pensión alimentos alimenticia", materia: "familia", arts: [["Ley 14.908", "1"]] },
  { si: "discriminaron discriminación discriminado derechos fundamentales", arts: [["Constitución Política de la República", "19"]] },
];
