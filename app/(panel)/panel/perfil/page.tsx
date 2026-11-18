import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormPerfil } from "@/components/formularios";
import { DropdownMulti } from "@/components/panel/DropdownMulti";
import { requerirAbogado } from "@/lib/guards";
import { obtenerPerfil } from "@/lib/datos";
import { hayFiltros, leerAlertas } from "@/lib/alertas";
import { DURACIONES, leerHorario } from "@/lib/agenda-publica";
import { resumenResenas, textoTiempo, tiempoRespuestaHoras } from "@/lib/resenas";
import { guardarMiHorario, guardarMisAvisos } from "@/lib/acciones/avisos";
import { MATERIAS, PRESUPUESTOS, REGIONES } from "@/lib/materias";
import { resumenCuenta } from "@/lib/pagos-datos";
import { BANCOS, TIPOS_CUENTA } from "@/lib/pagos";
import { borrarCuentaDeposito, guardarCuentaDeposito } from "@/lib/acciones/pagos";

export const metadata: Metadata = { title: "Mi perfil" };
export const dynamic = "force-dynamic";

const DIAS = [[1, "L"], [2, "M"], [3, "X"], [4, "J"], [5, "V"], [6, "S"], [7, "D"]] as const;
const NOMBRE_DIA = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const HORAS = Array.from({ length: 33 }, (_, i) => {
  const minuto = 6 * 60 + i * 30;
  return `${String(Math.floor(minuto / 60)).padStart(2, "0")}:${String(minuto % 60).padStart(2, "0")}`;
});

export default async function MiPerfil({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const usuario = await requerirAbogado();
  const sp = await searchParams;
  const perfil = await obtenerPerfil(usuario.id);
  if (!perfil) notFound();
  const [alertas, horario, resenas, horas, cuenta] = await Promise.all([
    leerAlertas(usuario.id),
    leerHorario(usuario.id),
    resumenResenas(usuario.id),
    tiempoRespuestaHoras(usuario.id),
    resumenCuenta(usuario.id),
  ]);
  const urgenciaMinima = alertas.urgencias.includes("pronto")
    ? "pronto"
    : alertas.urgencias.includes("urgente")
      ? "urgente"
      : "";

  const pasos = [
    { texto: "Cuenta verificada", hecho: perfil.verificadoEn !== "", ancla: "#t-datos" },
    { texto: "Presentación escrita", hecho: perfil.bio.trim().length >= 40, ancla: "#t-datos" },
    { texto: "Horas para reservar", hecho: horario.activo, ancla: "#t-horario" },
    { texto: "Avisos elegidos", hecho: hayFiltros(alertas), ancla: "#t-avisos" },
  ];
  const listos = pasos.filter((p) => p.hecho).length;

  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <h1>Mi perfil</h1>
          <span className="p-sub">Lo que ven las personas en <Link href="/asesoria">Asesoría</Link></span>
        </div>
      </header>

      {listos < pasos.length ? (
        <nav className="pf-pasos" aria-label="Primeros pasos">
          <strong>Primeros pasos · {listos} de {pasos.length}</strong>
          <ul>
            {pasos.map((p) => (
              <li key={p.texto} data-hecho={p.hecho ? "1" : "0"}>
                <a href={p.ancla}>
                  <span aria-hidden="true">{p.hecho ? "✓" : "○"}</span> {p.texto}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {resenas.total || horas !== null ? (
        <div className="pf-kpis">
          <div>
            <b>{resenas.total ? `${resenas.promedio} ★` : "—"}</b>
            <span>{resenas.total ? `${resenas.total} reseña${resenas.total === 1 ? "" : "s"}` : "Sin reseñas aún"}</span>
          </div>
          <div>
            <b>{horas !== null ? textoTiempo(horas) : "—"}</b>
            <span>En tomar un caso</span>
          </div>
        </div>
      ) : null}

      <div className="pf-grid">
        <section className="pf-tarjeta" aria-labelledby="t-datos">
          <h2 id="t-datos">Mis datos</h2>
          <FormPerfil
            inicial={{
              nombre: perfil.nombre,
              titulo: perfil.titulo,
              registro: perfil.registro,
              ubicacion: perfil.ubicacion,
              direccion: perfil.direccion,
              lat: perfil.lat,
              lng: perfil.lng,
              honorarios: perfil.honorarios.join("\n"),
              bio: perfil.bio,
              precioInforme: perfil.precioInforme,
              metaSemanal: perfil.metaSemanal,
              instruccionesPago: perfil.instruccionesPago,
              materias: perfil.materias,
              publicado: perfil.publicado,
              verificadoEn: perfil.verificadoEn,
            }}
          />
        </section>

        <div className="pf-lado">
          <section className="pf-tarjeta" aria-labelledby="t-avisos">
            <h2 id="t-avisos">Avisos de solicitudes nuevas</h2>
            <p className="pf-ayuda">Te escribimos por correo solo si el caso coincide. Sin filtros, te llegan todos.</p>
            {sp.avisos === "ok" ? <p className="aviso aviso-ok" role="status">Avisos guardados.</p> : null}
            <form action={guardarMisAvisos} className="pf-form">
              <label className="pf-campo pf-ancho">
                <span>Correo por cada solicitud</span>
                <select name="activas" defaultValue={alertas.activas ? "1" : "0"}>
                  <option value="1">Sí, avisarme</option>
                  <option value="0">No, solo el resumen diario</option>
                </select>
              </label>
              <DropdownMulti nombre="materias" etiqueta="Tipo de caso" todos="Todos" elegidas={alertas.materias} opciones={MATERIAS.map((m) => ({ valor: m.clave, texto: m.nombre }))} />
              <DropdownMulti nombre="presupuestos" etiqueta="Presupuesto" todos="Cualquiera" elegidas={alertas.presupuestos} opciones={PRESUPUESTOS.map((x) => ({ valor: x, texto: x }))} />
              <DropdownMulti nombre="regiones" etiqueta="Región" todos="Todas" elegidas={alertas.regiones} opciones={REGIONES.map((x) => ({ valor: x, texto: x }))} />
              <label className="pf-campo">
                <span>Urgencia</span>
                <select name="urgencia_min" defaultValue={urgenciaMinima}>
                  <option value="">Cualquiera</option>
                  <option value="urgente">Solo con plazo cercano</option>
                  <option value="pronto">Plazo cercano o próximas semanas</option>
                </select>
              </label>
              <label className="pf-campo">
                <span>Información de la solicitud</span>
                <select name="minimo" defaultValue={String(alertas.minimo)}>
                  <option value="0">Cualquiera</option>
                  <option value="45">Media o completa</option>
                  <option value="75">Solo completa</option>
                </select>
              </label>
              <div className="pf-acciones pf-ancho">
                <button type="submit" className="btn btn-chico">Guardar avisos</button>
              </div>
            </form>
          </section>

          <section className="pf-tarjeta" aria-labelledby="t-horario">
            <h2 id="t-horario">Horas para reservar</h2>
            <p className="pf-ayuda">La persona elige una hora libre desde su seguimiento y queda en tu <Link href="/panel/crm/agenda">agenda</Link>.</p>
            {sp.horario === "ok" ? <p className="aviso aviso-ok" role="status">Horario guardado.</p> : null}
            <form action={guardarMiHorario} className="pf-form">
              <label className="pf-campo pf-ancho">
                <span>Reservas</span>
                <select name="activo" defaultValue={horario.activo ? "1" : "0"}>
                  <option value="1">Permitir reservar</option>
                  <option value="0">No por ahora</option>
                </select>
              </label>
              <div className="pf-campo pf-ancho">
                <span>Días</span>
                <div className="pf-dias">
                  {DIAS.map(([numero, abreviatura]) => (
                    <label key={numero} title={NOMBRE_DIA[numero - 1]}>
                      <input type="checkbox" name="dias" value={numero} defaultChecked={horario.dias.includes(numero)} />
                      <span>{abreviatura}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="pf-campo">
                <span>Desde</span>
                <select name="desde" defaultValue={horario.desde}>{HORAS.map((hora) => <option key={hora}>{hora}</option>)}</select>
              </label>
              <label className="pf-campo">
                <span>Hasta</span>
                <select name="hasta" defaultValue={horario.hasta}>{HORAS.map((hora) => <option key={hora}>{hora}</option>)}</select>
              </label>
              <label className="pf-campo">
                <span>Duración</span>
                <select name="duracion" defaultValue={String(horario.duracion)}>
                  {DURACIONES.map((duracion) => <option key={duracion} value={duracion}>{duracion} min</option>)}
                </select>
              </label>
              <div className="pf-acciones">
                <button type="submit" className="btn btn-chico">Guardar horario</button>
              </div>
            </form>
          </section>

          <section className="pf-tarjeta" id="t-pagos" aria-labelledby="t-pagos-h">
            <h2 id="t-pagos-h">Datos para recibir pagos</h2>
            <p className="pf-ayuda">
              Tus clientes te pagan por transferencia, directo a tu cuenta. Los datos se guardan cifrados y solo los ve la persona
              a la que le envías un cobro. <strong>No pedimos ni guardamos números de tarjeta.</strong>
            </p>
            {sp.cuenta === "ok" ? <p className="aviso aviso-ok" role="status">Guardamos tus datos de depósito.</p> : null}
            {sp.cuenta === "borrada" ? <p className="aviso aviso-ok" role="status">Borramos tus datos de depósito.</p> : null}
            {sp.cuenta === "banco" ? <p className="aviso aviso-error" role="alert">Elige el banco y el tipo de cuenta.</p> : null}
            {sp.cuenta === "numero" ? <p className="aviso aviso-error" role="alert">El número de cuenta debe tener solo dígitos (entre 6 y 20).</p> : null}
            {sp.cuenta === "rut" ? <p className="aviso aviso-error" role="alert">Revisa el RUT: el dígito verificador no calza.</p> : null}
            {sp.cuenta === "titular" ? <p className="aviso aviso-error" role="alert">Escribe el nombre del titular.</p> : null}
            {sp.cuenta === "correo" ? <p className="aviso aviso-error" role="alert">El correo para comprobantes no es válido.</p> : null}
            {sp.cuenta === "limite" ? <p className="aviso aviso-error" role="alert">Muchos intentos seguidos. Prueba más tarde.</p> : null}
            {cuenta ? (
              <p className="pf-cuenta-actual">
                <strong>{cuenta.banco}</strong> · {cuenta.tipo} · terminada en <b>{cuenta.ultimos}</b> · {cuenta.titular}
              </p>
            ) : null}
            <form action={guardarCuentaDeposito} className="pf-form" autoComplete="off">
              <label className="pf-campo">
                <span>Banco</span>
                <select name="banco" required defaultValue={cuenta?.banco ?? ""}>
                  <option value="" disabled>Elige un banco</option>
                  {BANCOS.map((b) => <option key={b}>{b}</option>)}
                </select>
              </label>
              <label className="pf-campo">
                <span>Tipo de cuenta</span>
                <select name="tipo" required defaultValue={cuenta?.tipo ?? ""}>
                  <option value="" disabled>Elige el tipo</option>
                  {TIPOS_CUENTA.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                </select>
              </label>
              <label className="pf-campo">
                <span>Número de cuenta{cuenta ? " (completo, para cambiarlo)" : ""}</span>
                <input name="numero" inputMode="numeric" required maxLength={30} placeholder={cuenta ? `•••• ${cuenta.ultimos}` : "Solo dígitos"} />
              </label>
              <label className="pf-campo">
                <span>RUT del titular</span>
                <input name="rut" required maxLength={14} defaultValue={cuenta?.rut ?? ""} placeholder="12.345.678-5" />
              </label>
              <label className="pf-campo pf-ancho">
                <span>Nombre del titular</span>
                <input name="titular" required maxLength={80} defaultValue={cuenta?.titular ?? ""} />
              </label>
              <label className="pf-campo pf-ancho">
                <span>Correo para comprobantes (opcional)</span>
                <input name="correo" type="email" maxLength={120} defaultValue={cuenta?.correo ?? ""} />
              </label>
              <div className="pf-acciones">
                <button type="submit" className="btn btn-chico">{cuenta ? "Actualizar datos" : "Guardar datos"}</button>
              </div>
            </form>
            {cuenta ? (
              <form action={borrarCuentaDeposito} className="pf-borrar-cuenta">
                <button type="submit" className="btn btn-secundario btn-chico">Borrar mis datos de depósito</button>
              </form>
            ) : null}
          </section>
        </div>
      </div>
    </>
  );
}
