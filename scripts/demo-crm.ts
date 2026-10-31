import { cargarEnv } from "./_env";
cargarEnv();

/**
 * Datos de DEMOSTRACIÓN del CRM (solo desarrollo): 14 clientes ficticios con semanas de
 * historial, para ver los indicadores y gráficos con vida. Usa al asesor de «npm run demo».
 * Todos los nombres son inventados.
 */
async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("npm run demo:crm no se puede usar en producción.");
    process.exit(1);
  }
  const { getDb, cerrarDb } = await import("../lib/db");
  const { hashClave } = await import("../lib/auth");
  const crm = await import("../lib/crm/servicio");
  const { hoyLocal, sumarDias, inicioSemana } = await import("../lib/crm/fechas");

  const d = await getDb();
  const r = await d.execute({ sql: "SELECT id FROM usuarios WHERE email = ?", args: ["asesor@neife.test"] });
  let id = Number(r.rows[0]?.id);
  if (!id) {
    const ins = await d.execute({
      sql: "INSERT INTO usuarios (email, password_hash, rol, nombre, estado) VALUES (?, ?, 'abogado', ?, 'activo')",
      args: ["asesor@neife.test", await hashClave("AsesorDemo-2026"), "Asesor de Demostración"],
    });
    id = Number(ins.lastInsertRowid);
    await d.execute({
      sql: `INSERT INTO perfiles (usuario_id, slug, titulo, registro, materias, ubicacion) VALUES (?, 'asesor-demo', 'Abogado', 'Demo', 'laboral,familia', 'Santiago')`,
      args: [id],
    });
  }
  const ya = await d.execute({ sql: "SELECT COUNT(*)::int AS n FROM crm_personas WHERE abogado_id = ?", args: [id] });
  if (Number(ya.rows[0].n) > 0) {
    console.log("El CRM de demostración ya tiene datos. No se agregó nada.");
    await cerrarDb();
    return;
  }

  const hoy = hoyLocal();
  const lunes = inicioSemana(hoy);
  const dia = (n: number) => sumarDias(hoy, n);

  // nombre, contacto, materia, comuna, origen, días atrás en que llegó, etapa final
  const personas: [string, string, string, string, string, number, string][] = [
    ["Camila Rojas Pérez", "+56 9 5555 0101", "laboral", "Maipú", "web", 38, "mandato"],
    ["Ignacio Fuentes", "ignacio@ejemplo.test", "arriendo", "Ñuñoa", "referido", 33, "derivado"],
    ["Valentina Soto", "+56 9 5555 0103", "familia", "Puente Alto", "whatsapp", 29, "con_hito"],
    ["Pedro Aravena", "+56 9 5555 0104", "civil", "Santiago", "referido", 24, "en_asesoria"],
    ["Constructora Andes SpA", "contacto@andes.test", "civil", "Providencia", "red", 22, "cerrado"],
    ["Daniela Muñoz", "+56 9 5555 0106", "consumidor", "La Florida", "web", 18, "en_asesoria"],
    ["Matías Contreras", "+56 9 5555 0107", "penal", "San Bernardo", "llamada", 15, "con_hito"],
    ["Francisca Herrera", "francisca@ejemplo.test", "laboral", "Valparaíso", "web", 12, "en_asesoria"],
    ["Sebastián Núñez", "+56 9 5555 0109", "familia", "Viña del Mar", "referido", 9, "contactado"],
    ["Javiera Castillo", "+56 9 5555 0110", "arriendo", "Concepción", "actividad", 6, "en_asesoria"],
    ["Tomás Bravo", "+56 9 5555 0111", "laboral", "Santiago", "web", 4, "prospecto"],
    ["Antonia Vega", "+56 9 5555 0112", "familia", "Maipú", "referido", 3, "prospecto"],
    ["Joaquín Silva", "+56 9 5555 0113", "consumidor", "Ñuñoa", "whatsapp", 2, "contactado"],
    ["Paula Ibáñez", "+56 9 5555 0114", "civil", "Providencia", "red", 1, "prospecto"],
  ];
  const regiones: Record<string, string> = { Valparaíso: "Valparaíso", "Viña del Mar": "Valparaíso", Concepción: "Biobío" };

  for (const [nombre, contacto, materia, comuna, origen, atras, etapa] of personas) {
    const llegada = dia(-atras);
    const pid = await crm.crearPersona(
      id,
      {
        nombre,
        telefono: contacto.includes("@") ? "" : contacto,
        email: contacto.includes("@") ? contacto : "",
        materia,
        comuna,
        region: regiones[comuna] ?? "Metropolitana de Santiago",
        origen,
        tipo: nombre.includes("SpA") ? "empresa" : "natural",
      },
      llegada,
    );
    const nSes = etapa === "prospecto" || etapa === "contactado" ? 0 : etapa === "en_asesoria" ? 2 : 3;
    if (etapa !== "prospecto") {
      await crm.registrarInteraccion(id, { personaId: pid, tipo: "contacto", canal: "whatsapp", fecha: sumarDias(llegada, 1), nota: "Primer contacto." }, hoy);
    }
    for (let k = 0; k < nSes; k++) {
      const f = sumarDias(llegada, 3 + k * 5);
      if (f > hoy) break;
      await crm.registrarInteraccion(
        id,
        { personaId: pid, tipo: "asesoria", canal: k % 2 ? "video" : "presencial", fecha: f, conColega: k === 0 && materia === "laboral", nota: "Se revisó el caso y los documentos." },
        hoy,
      );
    }
    if (etapa === "con_hito") {
      await crm.fijarHito(id, pid, nombre.startsWith("Matías") ? sumarDias(lunes, 3) : sumarDias(lunes, 6), "audiencia", dia(-1));
    } else if (["mandato", "derivado", "cerrado"].includes(etapa)) {
      const hito = sumarDias(llegada, 12);
      await crm.fijarHito(id, pid, hito, "audiencia", hito);
      await crm.registrarInteraccion(id, { personaId: pid, tipo: "audiencia", canal: "presencial", fecha: hito, nota: "Asistió a la audiencia." }, hoy);
      await crm.cambiarEtapa(id, pid, "mandato", sumarDias(llegada, 14));
      if (etapa === "derivado") await crm.cambiarEtapa(id, pid, "derivado", sumarDias(llegada, 20));
      if (etapa === "cerrado") await crm.cambiarEtapa(id, pid, "cerrado", sumarDias(llegada, 26));
    }
    if (etapa === "contactado" || etapa === "prospecto") await crm.programarContacto(id, pid, dia(etapa === "prospecto" ? 0 : -1));
  }

  await crm.crearTarea(id, { texto: "Pedir contrato de arriendo firmado", vence: dia(1) });
  await crm.crearTarea(id, { texto: "Preparar carpeta para la audiencia", vence: dia(0) });
  await crm.crearTarea(id, { texto: "Llamar a la contraparte", vence: dia(-2) });
  await crm.crearPlan(id, { fuente: "actividades", fecha: dia(1), texto: "Charla en la junta de vecinos" });
  await crm.crearPlan(id, { fuente: "red", fecha: dia(2), texto: "Café con colega de familia para derivaciones" });
  await crm.fijarMeta(id, "consultas_nuevas", "semana", lunes, 6);

  console.log("Listo. Entra como asesor@neife.test / AsesorDemo-2026 y abre /panel/crm");
  await cerrarDb();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
