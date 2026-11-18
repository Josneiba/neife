/** Archivo de calendario (.ics) para agregar una cita a Google, Apple u Outlook. Se genera aquí, sin servicios externos. */

const ZONA = "America/Santiago";

/** Convierte fecha y hora de Chile a un instante UTC. */
export function aUtcChile(fecha: string, hora: string): Date {
  const [a, m, d] = fecha.split("-").map(Number);
  const [h, mi] = hora.split(":").map(Number);
  const nominal = Date.UTC(a, m - 1, d, h, mi);
  let instante = nominal;
  for (let i = 0; i < 2; i++) {
    const parte = new Intl.DateTimeFormat("en-US", { timeZone: ZONA, timeZoneName: "longOffset" })
      .formatToParts(new Date(instante))
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT-03:00";
    const t = /GMT([+-])(\d{2}):?(\d{2})?/.exec(parte);
    const minutos = t ? (t[1] === "-" ? -1 : 1) * (Number(t[2]) * 60 + Number(t[3] ?? 0)) : -180;
    instante = nominal - minutos * 60_000;
  }
  return new Date(instante);
}

const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

function plegar(linea: string): string {
  const partes: string[] = [];
  let resto = linea;
  while (resto.length > 73) {
    partes.push(resto.slice(0, 73));
    resto = " " + resto.slice(73);
  }
  partes.push(resto);
  return partes.join("\r\n");
}

export type EventoIcs = { uid: string; fecha: string; horaIni: string; horaFin: string; titulo: string; descripcion?: string; lugar?: string };

function vevento(e: EventoIcs): string[] {
  return [
    "BEGIN:VEVENT",
    `UID:${e.uid}@neife`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(aUtcChile(e.fecha, e.horaIni))}`,
    `DTEND:${fmt(aUtcChile(e.fecha, e.horaFin))}`,
    `SUMMARY:${esc(e.titulo)}`,
    ...(e.descripcion ? [`DESCRIPTION:${esc(e.descripcion)}`] : []),
    ...(e.lugar ? [`LOCATION:${esc(e.lugar)}`] : []),
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(e.titulo)}`,
    "END:VALARM",
    "END:VEVENT",
  ];
}

export function crearIcsVarios(eventos: EventoIcs[]): string {
  const lineas = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Neife//Citas//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", ...eventos.flatMap(vevento), "END:VCALENDAR"];
  return lineas.map(plegar).join("\r\n") + "\r\n";
}

export function crearIcs(e: EventoIcs): string {
  return crearIcsVarios([e]);
}
