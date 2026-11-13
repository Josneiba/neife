import PDFDocument from "pdfkit";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { calcularAvance, type Expediente } from "./expediente";
import { limpio } from "./informe-pdf";
import { nombreEtapaCrm } from "./crm/catalogo";
import { nombreEtapa } from "./etapas";
import { nombreMateria, nombreUrgencia } from "./materias";
import { folio } from "./formato";

/**
 * Expediente en PDF con formato de informe jurídico: carátula, secciones en números romanos,
 * firma y pie con revisión y paginación. Se arma solo con lo que hay registrado; lo que falta
 * queda marcado como «Pendiente» y se completa solo en la siguiente descarga.
 */

const C = { tinta: "#1f2a2a", suave: "#5b6767", cafe: "#74483f", linea: "#9a8a78", pendiente: "#8a7f74", barra: "#436977", fondo: "#f3e6d3" };
const M = 72;
const W = 595.28;
const H = 841.89;
const ANCHO = W - M * 2;

const ROMANOS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

function fechaLarga(f: Date): string {
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "America/Santiago" }).format(f);
}
function fechaDia(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(d);
}

export type OpcionesExpediente = { paraPersona: boolean };

export function generarExpedientePdf(e: Expediente, op: OpcionesExpediente): Promise<Buffer> {
  const { solicitud: s, asesor, informe, pendientes, persona } = e;
  const c = informe?.contenido;
  const avance = calcularAvance(e);
  const hoy = new Date();
  const numFolio = folio(s.codigo);
  const revision = avance.hitos.filter((h) => h.hecho).length;
  const final = Boolean(informe?.entregado);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: M, bottom: M + 10, left: M, right: M },
      bufferPages: true,
      info: {
        Title: `Informe de asesoría jurídica — Expediente ${numFolio}`,
        Author: "Neife",
        Subject: final ? "Informe final de orientación jurídica" : "Informe de orientación jurídica en elaboración",
      },
    });
    const trozos: Buffer[] = [];
    doc.on("data", (t: Buffer) => trozos.push(t));
    doc.on("end", () => resolve(Buffer.concat(trozos)));
    doc.on("error", reject);

    let sec = 0;
    const espacio = (alto: number) => {
      if (doc.y > H - M - alto) doc.addPage();
    };
    const seccion = (titulo: string) => {
      espacio(110);
      doc.moveDown(0.9);
      doc.font("Times-Bold").fontSize(12).fillColor(C.tinta).text(`${ROMANOS[sec++]}.  ${titulo.toUpperCase()}`, M, doc.y, { width: ANCHO });
      doc.moveDown(0.35);
    };
    const parrafo = (t: string) => {
      doc.font("Times-Roman").fontSize(11.5).fillColor(C.tinta).text(limpio(t), M, doc.y, { width: ANCHO, align: "justify", lineGap: 3 });
      doc.moveDown(0.5);
    };
    const subtitulo = (t: string) => {
      espacio(70);
      doc.font("Times-Bold").fontSize(11.5).fillColor(C.cafe).text(limpio(t), M, doc.y, { width: ANCHO });
      doc.moveDown(0.15);
    };
    const pendiente = (t: string) => {
      doc.font("Times-Italic").fontSize(11).fillColor(C.pendiente).text(limpio(`Pendiente: ${t}`), M, doc.y, { width: ANCHO });
      doc.moveDown(0.5);
    };
    const lista = (items: string[]) => {
      for (const t of items) {
        espacio(40);
        const y = doc.y;
        doc.font("Times-Roman").fontSize(11.5).fillColor(C.tinta).text("•", M + 6, y, { width: 12 });
        doc.text(limpio(t), M + 22, y, { width: ANCHO - 22, align: "justify", lineGap: 2 });
        doc.moveDown(0.15);
      }
      doc.moveDown(0.35);
    };
    const campoOPendiente = (texto: string | undefined, falta: string) => (texto && texto.trim() ? parrafo(texto) : pendiente(falta));

    /* ── Carátula ── */
    try {
      const ruta = join(process.cwd(), "public", "logo-neife-chico.png");
      if (existsSync(ruta)) doc.image(ruta, M, M - 20, { fit: [78, 34] });
    } catch {
      /* sin logo */
    }
    doc.font("Times-Roman").fontSize(9.5).fillColor(C.suave).text(`Expediente N° ${numFolio}`, M, M - 14, { width: ANCHO, align: "right" });
    doc.y = M + 26;
    doc.font("Times-Bold").fontSize(17).fillColor(C.tinta).text("INFORME DE ASESORÍA JURÍDICA", M, doc.y, { width: ANCHO, align: "center" });
    doc.font("Times-Italic").fontSize(11.5).fillColor(C.suave).text(final ? "Informe final de orientación" : "Informe preliminar en elaboración", M, doc.y + 2, { width: ANCHO, align: "center" });
    doc.moveDown(0.8);
    doc.moveTo(M, doc.y).lineTo(M + ANCHO, doc.y).lineWidth(1.2).strokeColor(C.tinta).stroke();
    doc.moveDown(0.15);
    doc.moveTo(M, doc.y).lineTo(M + ANCHO, doc.y).lineWidth(0.4).strokeColor(C.tinta).stroke();
    doc.moveDown(0.7);

    const ficha: [string, string][] = [
      ["Materia", nombreMateria(s.materia)],
      ["Consultante", s.nombre],
      ["Región", [persona?.comuna, s.region].filter(Boolean).join(", ") || "No indicada"],
      ["Fecha de ingreso", fechaDia(s.creadoEn)],
      ["Urgencia declarada", nombreUrgencia(s.urgencia)],
      ["Asesor responsable", asesor ? `${asesor.nombre}, ${asesor.titulo}` : "Sin asesor asignado"],
      ["Etapa del caso", `${nombreEtapa(s.estado)}${persona && !op.paraPersona ? ` · CRM: ${nombreEtapaCrm(persona.etapa)}` : ""}`],
      ["Revisión", `N° ${revision} · ${fechaLarga(hoy)}`],
    ];
    for (const [k, v] of ficha) {
      const y = doc.y;
      doc.font("Times-Bold").fontSize(11).fillColor(C.tinta).text(`${k}:`, M, y, { width: 130 });
      doc.font("Times-Roman").fontSize(11.5).text(limpio(v), M + 135, y, { width: ANCHO - 135 });
      doc.y = Math.max(doc.y, y + 14) + 2;
    }

    /* Barra de avance */
    doc.moveDown(0.5);
    const yb = doc.y;
    doc.rect(M, yb, ANCHO, 40).fill(C.fondo);
    doc.font("Times-Bold").fontSize(10.5).fillColor(C.tinta).text(`Avance del expediente: ${avance.porcentaje}%  ·  ${avance.etapa}`, M + 10, yb + 7, { width: ANCHO - 20 });
    doc.rect(M + 10, yb + 25, ANCHO - 20, 7).fill("#e4cfbb");
    doc.rect(M + 10, yb + 25, ((ANCHO - 20) * avance.porcentaje) / 100, 7).fill(C.barra);
    doc.y = yb + 52;

    /* I. Antecedentes */
    seccion("Antecedentes de la consulta");
    parrafo(
      `Con fecha ${fechaDia(s.creadoEn)}, ${s.nombre} ingresó a la plataforma Neife una solicitud de orientación en materia de ${nombreMateria(s.materia).toLowerCase()}. ` +
        (asesor ? `El caso está a cargo de ${asesor.nombre}, ${asesor.titulo}. ` : "El caso aún no ha sido tomado por un asesor. ") +
        (s.presupuesto && !op.paraPersona ? `Presupuesto indicado por la persona: ${s.presupuesto}. ` : ""),
    );

    /* II. Hechos */
    seccion("Hechos");
    subtitulo("Relato del consultante");
    parrafo(s.relato || "Sin relato registrado.");
    subtitulo("Cronología");
    campoOPendiente(c?.cronologia, "el asesor ordenará los hechos por fecha cuando reciba los antecedentes.");

    /* III. Objeto */
    seccion("Objeto de la consulta");
    campoOPendiente(c?.objeto, "el asesor precisará qué se busca resolver.");

    /* IV. Documentos */
    seccion("Documentos y antecedentes");
    subtitulo("Documentos revisados");
    if (e.documentosLeidos.length) lista(e.documentosLeidos);
    else pendiente("aún no se han revisado documentos del caso.");
    subtitulo("Datos y documentos solicitados");
    const pedidos = pendientes.length ? pendientes.map((p) => `${p.hecho ? "[Recibido] " : "[Falta] "}${p.texto}`) : [...(c?.datos ?? []), ...(c?.documentos ?? [])];
    if (pedidos.length) lista(pedidos);
    else pendiente("se definirán al tomar el caso.");

    /* V. Fundamentos de derecho */
    seccion("Fundamentos de derecho");
    const normas = (c?.normas ?? []).filter((n) => n.incluir);
    if (normas.length) {
      for (const n of normas) {
        espacio(80);
        doc.font("Times-Bold").fontSize(11.5).fillColor(C.tinta).text(limpio(`${n.norma}${n.numero ? `, art. ${n.numero}` : ""}`), M, doc.y, { width: ANCHO });
        const texto = n.texto.length > 700 ? `${n.texto.slice(0, 700).trim()}…` : n.texto;
        doc.font("Times-Italic").fontSize(11).fillColor(C.suave).text(limpio(`«${texto}»`), M + 14, doc.y + 1, { width: ANCHO - 14, align: "justify", lineGap: 2 });
        if (n.comentario.trim()) doc.font("Times-Roman").fontSize(11).fillColor(C.tinta).text(limpio(`Comentario: ${n.comentario}`), M + 14, doc.y + 2, { width: ANCHO - 14, align: "justify" });
        if (n.fuente) doc.font("Times-Roman").fontSize(9).fillColor(C.suave).text(limpio(`Fuente: ${n.fuente}`), M + 14, doc.y + 1, { width: ANCHO - 14 });
        doc.moveDown(0.6);
      }
    } else pendiente("el asesor indicará las normas aplicables.");
    if (c?.derechos.length) {
      subtitulo("Derechos que asisten al consultante");
      lista(c.derechos);
    }

    /* VI. Análisis */
    seccion("Análisis y vías de acción");
    if (c?.resumen.trim()) {
      subtitulo("Resumen");
      parrafo(c.resumen);
    }
    if (c?.puntos.trim()) {
      subtitulo("Puntos relevantes");
      parrafo(c.puntos);
    }
    subtitulo("Vías de acción");
    campoOPendiente(c?.vias, "el asesor describirá los caminos posibles.");
    subtitulo("Plazos");
    campoOPendiente(c?.plazos, "el asesor indicará los plazos que corren.");

    /* VII. Actuaciones */
    seccion("Actuaciones realizadas");
    const acts = op.paraPersona ? e.actuaciones.filter((a) => !a.interna) : e.actuaciones;
    if (acts.length) {
      for (const a of acts) {
        espacio(50);
        const y = doc.y;
        doc.font("Times-Bold").fontSize(10.5).fillColor(C.tinta).text(fechaDia(a.fecha), M, y, { width: 70 });
        doc.font("Times-Roman").fontSize(11).text(limpio(a.titulo), M + 76, y, { width: ANCHO - 76 });
        if (a.detalle.trim()) doc.font("Times-Italic").fontSize(10.5).fillColor(C.suave).text(limpio(a.detalle), M + 76, doc.y, { width: ANCHO - 76 });
        doc.moveDown(0.35);
      }
    } else pendiente("aún no hay actuaciones registradas.");

    /* VIII. Conclusiones */
    seccion("Conclusiones y recomendaciones");
    campoOPendiente(c?.conclusiones, "se redactarán cuando el análisis esté completo.");
    if (c?.observaciones.trim()) {
      subtitulo("Observaciones");
      parrafo(c.observaciones);
    }
    if (c?.abogadoDestino.trim()) {
      subtitulo("Derivación");
      parrafo(`Se recomienda derivar el caso a ${c.abogadoDestino.trim()}.`);
    }

    /* IX. Estado de avance */
    seccion("Estado de avance y próximos pasos");
    for (const h of avance.hitos) {
      espacio(24);
      const y = doc.y;
      doc.font("Times-Bold").fontSize(11.5).fillColor(h.hecho ? C.barra : C.pendiente).text(h.hecho ? "[x]" : "[ ]", M, y, { width: 24 });
      doc.font("Times-Roman").fontSize(11.5).fillColor(h.hecho ? C.tinta : C.pendiente).text(limpio(h.texto), M + 28, y, { width: ANCHO - 28 });
      doc.moveDown(0.15);
    }
    const abiertos = pendientes.filter((p) => !p.hecho);
    if (abiertos.length && op.paraPersona) {
      doc.moveDown(0.5);
      subtitulo("Lo que el asesor necesita de ti");
      lista(abiertos.map((p) => p.texto));
    }

    /* Firma */
    espacio(130);
    doc.moveDown(1.8);
    const xf = M + ANCHO - 230;
    doc.moveTo(xf, doc.y).lineTo(xf + 230, doc.y).lineWidth(0.6).strokeColor(C.tinta).stroke();
    doc.font("Times-Bold").fontSize(11.5).fillColor(C.tinta).text(limpio(asesor?.nombre ?? "Asesor por asignar"), xf, doc.y + 4, { width: 230, align: "center" });
    if (asesor) doc.font("Times-Roman").fontSize(10.5).text(limpio(asesor.titulo), xf, doc.y, { width: 230, align: "center" });
    doc.font("Times-Roman").fontSize(10.5).fillColor(C.suave).text(fechaLarga(hoy), xf, doc.y, { width: 230, align: "center" });

    doc.moveDown(1.2);
    espacio(60);
    doc.font("Times-Italic").fontSize(9).fillColor(C.suave).text(
      "Documento de orientación general generado a partir de los antecedentes registrados a la fecha. No constituye patrocinio ni representación judicial, y se actualiza a medida que el asesor incorpora nueva información.",
      M,
      doc.y,
      { width: ANCHO, align: "justify" },
    );

    /* Pie de página con paginación */
    const rango = doc.bufferedPageRange();
    for (let i = 0; i < rango.count; i++) {
      doc.switchToPage(rango.start + i);
      doc.page.margins.bottom = 0; // escribir en el margen inferior no debe crear páginas nuevas
      const y = H - M + 4;
      doc.moveTo(M, y - 6).lineTo(M + ANCHO, y - 6).lineWidth(0.4).strokeColor(C.linea).stroke();
      doc.font("Times-Roman").fontSize(8.5).fillColor(C.suave);
      doc.text(`Expediente ${numFolio} · Revisión ${revision} · ${fechaLarga(hoy)}${op.paraPersona ? " · Copia para el consultante" : ""}`, M, y, { width: ANCHO - 70, lineBreak: false });
      doc.text(`Página ${i + 1} de ${rango.count}`, M, y, { width: ANCHO, align: "right", lineBreak: false });
    }
    doc.end();
  });
}
