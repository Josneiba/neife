import PDFDocument from "pdfkit";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ContenidoInforme } from "./datos";
import { nombreMateria } from "./materias";
import { textoFuente } from "./normas";

const C = {
  pizarra: "#3B4848",
  cafe: "#88584E",
  crema: "#E4CFBB",
  azul: "#71959F",
  rosa: "#C78178",
  amarillo: "#FFDE59",
  suave: "#5B6767",
};

const MARGEN = 56;
const ANCHO_PAGINA = 595.28;
const ALTO_PAGINA = 841.89;
const ANCHO = ANCHO_PAGINA - MARGEN * 2;
const LIMITE_ARTICULO = 3000;

/** Las fuentes estándar del PDF solo cubren caracteres latinos; el resto se descarta. */
function limpio(t: string): string {
  return t
    .replace(/[‐‑‒]/g, "-")
    .replace(/ /g, " ")
    .replace(/[^\n\x20-\x7E¡-ÿ–—‘’“”•…€]/g, "");
}

export type DatosPdf = {
  folio: string;
  fecha: string;
  asesorNombre: string;
  asesorTitulo: string;
  consultante?: string;
  region?: string;
  contenido: ContenidoInforme;
  /** Normas de la materia que aún no están en la biblioteca: se avisa que no fueron consideradas. */
  normasPendientes?: string[];
};

function logo(doc: PDFKit.PDFDocument, x: number, y: number) {
  // Logo oficial sobre una placa crema (la bandeja del logo es pizarra y se perdería en el encabezado oscuro).
  doc.roundedRect(x, y, 86, 44, 6).fill(C.crema);
  try {
    const ruta = join(process.cwd(), "public", "logo-neife-chico.png");
    if (existsSync(ruta)) doc.image(ruta, x + 6, y + 6, { fit: [74, 32], align: "center", valign: "center" });
  } catch {
    doc.font("Helvetica-Bold").fontSize(14).fillColor(C.pizarra).text("Neife", x + 6, y + 15, { lineBreak: false });
  }
}

function titulo(doc: PDFKit.PDFDocument, texto: string) {
  if (doc.y > ALTO_PAGINA - 150) doc.addPage();
  doc.moveDown(0.9);
  doc.font("Helvetica-Bold").fontSize(13).fillColor(C.cafe).text(limpio(texto), MARGEN, doc.y, { width: ANCHO });
  const y = doc.y + 3;
  doc.moveTo(MARGEN, y).lineTo(MARGEN + ANCHO, y).lineWidth(0.8).strokeColor(C.azul).stroke();
  doc.y = y + 8;
}

function parrafo(doc: PDFKit.PDFDocument, texto: string) {
  doc.font("Helvetica").fontSize(10.5).fillColor(C.pizarra).text(limpio(texto), MARGEN, doc.y, {
    width: ANCHO,
    lineGap: 3,
  });
}

function lista(doc: PDFKit.PDFDocument, items: string[]) {
  doc.font("Helvetica").fontSize(10.5).fillColor(C.pizarra);
  for (const item of items) {
    doc.text(`•  ${limpio(item)}`, MARGEN + 4, doc.y, { width: ANCHO - 4, lineGap: 3, indent: 0 });
    doc.moveDown(0.15);
  }
}

export function generarPdf(datos: DatosPdf): Promise<Buffer> {
  const { contenido } = datos;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGEN, bottom: MARGEN + 12, left: MARGEN, right: MARGEN },
      bufferPages: true,
      info: {
        Title: `Informe de orientación ${datos.folio}`,
        Author: "Neife",
        Subject: "Informe de orientación general",
      },
    });
    const trozos: Buffer[] = [];
    doc.on("data", (t: Buffer) => trozos.push(t));
    doc.on("end", () => resolve(Buffer.concat(trozos)));
    doc.on("error", reject);

    /* Encabezado (solo primera página) */
    doc.rect(0, 0, ANCHO_PAGINA, 88).fill(C.pizarra);
    logo(doc, MARGEN, 22);
    doc
      .font("Helvetica")
      .fontSize(10.5)
      .fillColor(C.crema)
      .text("Informe de orientación", MARGEN, 40, { width: ANCHO, align: "right", lineBreak: false });
    doc.y = 118;

    /* Datos generales */
    doc.font("Helvetica-Bold").fontSize(22).fillColor(C.pizarra).text("Informe de orientación", MARGEN, doc.y);
    doc.font("Helvetica").fontSize(10.5).fillColor(C.suave).text("Informe jurídico preliminar", MARGEN, doc.y + 2);
    doc.moveDown(0.6);
    const filas: [string, string][] = [
      ["Folio", datos.folio],
      ["Fecha", datos.fecha],
      ["Materia", nombreMateria(contenido.materia)],
      ...(datos.consultante ? ([["Consultante", datos.consultante]] as [string, string][]) : []),
      ...(datos.region ? ([["Región", datos.region]] as [string, string][]) : []),
      ["Preparado por", `${datos.asesorNombre}, ${datos.asesorTitulo}`],
    ];
    if (contenido.abogadoDestino.trim()) filas.push(["Dirigido a", contenido.abogadoDestino.trim()]);
    for (const [k, v] of filas) {
      const y = doc.y;
      doc.font("Helvetica-Bold").fontSize(10).fillColor(C.suave).text(k, MARGEN, y, { width: 90 });
      doc.font("Helvetica").fontSize(10.5).fillColor(C.pizarra).text(limpio(v), MARGEN + 100, y, { width: ANCHO - 100 });
      doc.y = Math.max(doc.y, y + 14) + 2;
    }

    /* Aviso */
    doc.moveDown(0.8);
    const aviso =
      "Este informe es de orientación general. No constituye asesoría legal, patrocinio ni representación. " +
      "Los artículos se citan textualmente desde la biblioteca de Neife; conviene verificar su vigencia antes de actuar.";
    const altoAviso = doc.font("Helvetica").fontSize(9.5).heightOfString(aviso, { width: ANCHO - 24, lineGap: 2 }) + 16;
    const yAviso = doc.y;
    doc.rect(MARGEN, yAviso, ANCHO, altoAviso).fill(C.crema);
    doc.rect(MARGEN, yAviso, 3, altoAviso).fill(C.cafe);
    doc.font("Helvetica").fontSize(9.5).fillColor(C.pizarra).text(aviso, MARGEN + 14, yAviso + 8, {
      width: ANCHO - 24,
      lineGap: 2,
    });
    doc.y = yAviso + altoAviso + 4;

    /* Estructura de un informe jurídico en Chile: consulta, hechos, normativa, fundamentos, conclusiones */
    let n = 0;
    const sec = (t: string) => titulo(doc, `${++n}. ${t}`);

    sec("Consulta planteada");
    parrafo(doc, contenido.objeto.trim() || "Orientación general sobre la situación descrita por la persona.");

    sec("Antecedentes de hecho");
    parrafo(doc, contenido.resumen || "Sin relato.");
    const cron = contenido.cronologia.split("\n").map((l) => l.trim()).filter(Boolean);
    if (cron.length) {
      doc.moveDown(0.6);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(C.suave).text("Cronología", MARGEN, doc.y);
      doc.moveDown(0.2);
      lista(doc, cron);
    }
    if (contenido.documentos.length) {
      doc.moveDown(0.6);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(C.suave).text("Documentos y prueba", MARGEN, doc.y);
      doc.moveDown(0.2);
      lista(doc, contenido.documentos);
    }

    const normas = contenido.normas.filter((x) => x.incluir);
    sec("Normativa aplicable");
    if (normas.length === 0) {
      parrafo(doc, "No se seleccionaron normas para este informe.");
    } else {
      for (const nm of normas) {
        const recortado = nm.texto.length > LIMITE_ARTICULO;
        const texto = limpio(recortado ? nm.texto.slice(0, LIMITE_ARTICULO).trimEnd() + " [...]" : nm.texto);
        const encabezado = limpio(`${nm.norma}, artículo ${nm.numero}`);
        const alto =
          doc.font("Helvetica-Bold").fontSize(10.5).heightOfString(encabezado, { width: ANCHO - 14 }) +
          doc.font("Helvetica").fontSize(9.5).heightOfString(texto, { width: ANCHO - 14, lineGap: 2.5 }) +
          10;
        if (doc.y + Math.min(alto, 220) > ALTO_PAGINA - MARGEN - 20) doc.addPage();
        const y0 = doc.y;
        doc.font("Helvetica-Bold").fontSize(10.5).fillColor(C.pizarra).text(encabezado, MARGEN + 14, y0, { width: ANCHO - 14 });
        doc.moveDown(0.2);
        doc.font("Helvetica").fontSize(9.5).fillColor(C.suave).text(texto, MARGEN + 14, doc.y, { width: ANCHO - 14, lineGap: 2.5 });
        if (nm.fuente || nm.version) {
          doc.moveDown(0.25);
          doc.font("Helvetica").fontSize(8).fillColor(C.suave).text(`Fuente: ${limpio(textoFuente(nm.fuente ?? "", nm.version ?? ""))}`, MARGEN + 14, doc.y, { width: ANCHO - 14 });
        }
        if (nm.comentario.trim()) {
          doc.moveDown(0.3);
          doc.font("Helvetica-Oblique").fontSize(9.5).fillColor(C.cafe).text(`Nota del asesor: ${limpio(nm.comentario.trim())}`, MARGEN + 14, doc.y, {
            width: ANCHO - 14,
            lineGap: 2,
          });
        }
        const yFin = doc.y;
        doc.rect(MARGEN, y0, 2.5, Math.max(yFin - y0, 12)).fill(C.azul);
        doc.y = yFin + 10;
      }
    }

    if (datos.normasPendientes?.length) {
      parrafo(doc, `Normas de esta materia que aún no están en la biblioteca y por eso no fueron consideradas: ${datos.normasPendientes.join(", ")}. Debe verificarse su texto oficial en leychile.cl.`);
    }

    sec("Fundamentos");
    if (contenido.derechos.length) {
      doc.font("Helvetica-Bold").fontSize(10).fillColor(C.suave).text("Derechos que podrían asistir", MARGEN, doc.y);
      doc.moveDown(0.2);
      lista(doc, contenido.derechos);
    }
    if (contenido.vias.trim()) {
      doc.moveDown(0.5);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(C.suave).text("Vía habitual", MARGEN, doc.y);
      doc.moveDown(0.2);
      parrafo(doc, contenido.vias);
    }
    if (contenido.plazos.trim()) {
      doc.moveDown(0.5);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(C.suave).text("Plazos a verificar", MARGEN, doc.y);
      doc.moveDown(0.2);
      parrafo(doc, contenido.plazos);
    }
    if (contenido.puntos.trim()) {
      doc.moveDown(0.5);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(C.suave).text("Puntos que debe evaluar el abogado", MARGEN, doc.y);
      doc.moveDown(0.2);
      parrafo(doc, contenido.puntos);
    }

    sec("Conclusiones y recomendaciones");
    parrafo(doc, contenido.conclusiones.trim() || "Pendiente de redactar por el asesor.");
    const pend = [...contenido.datos.map((d) => `Confirmar: ${d}`), ...contenido.faltantes.map((f) => `Falta: ${f}`)];
    if (pend.length) {
      doc.moveDown(0.5);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(C.suave).text("Pendientes antes de actuar", MARGEN, doc.y);
      doc.moveDown(0.2);
      lista(doc, pend);
    }
    if (contenido.preguntas.length) {
      doc.moveDown(0.5);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(C.suave).text("Preguntas para la primera reunión", MARGEN, doc.y);
      doc.moveDown(0.2);
      lista(doc, contenido.preguntas);
    }
    if (contenido.observaciones.trim()) {
      doc.moveDown(0.5);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(C.suave).text("Observaciones", MARGEN, doc.y);
      doc.moveDown(0.2);
      parrafo(doc, contenido.observaciones);
    }

    /* Cierre: lugar, fecha y firma */
    if (doc.y > ALTO_PAGINA - 150) doc.addPage();
    doc.moveDown(2.2);
    const yF = doc.y;
    doc.moveTo(MARGEN, yF).lineTo(MARGEN + 200, yF).lineWidth(0.6).strokeColor(C.pizarra).stroke();
    doc.font("Helvetica-Bold").fontSize(10.5).fillColor(C.pizarra).text(limpio(datos.asesorNombre), MARGEN, yF + 5, { width: 300 });
    doc.font("Helvetica").fontSize(9.5).fillColor(C.suave).text(limpio(`${datos.asesorTitulo} · Chile, ${datos.fecha}`), MARGEN, doc.y, { width: ANCHO });

    /* Pie de página en todas las hojas */
    const rango = doc.bufferedPageRange();
    for (let i = 0; i < rango.count; i++) {
      doc.switchToPage(i);
      const margenAbajo = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      const y = ALTO_PAGINA - 40;
      doc.moveTo(MARGEN, y - 6).lineTo(MARGEN + ANCHO, y - 6).lineWidth(0.5).strokeColor(C.crema).stroke();
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(C.suave)
        .text(`Neife. Informe de orientación general. Folio ${datos.folio}`, MARGEN, y, { width: ANCHO - 60, lineBreak: false });
      doc.text(`${i + 1} de ${rango.count}`, MARGEN + ANCHO - 60, y, { width: 60, align: "right", lineBreak: false });
      doc.page.margins.bottom = margenAbajo;
    }

    doc.end();
  });
}
