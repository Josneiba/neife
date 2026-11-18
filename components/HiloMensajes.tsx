import { fechaHora } from "@/lib/formato";
import type { Mensaje, Autor } from "@/lib/mensajes-datos";
import { MAX_MENSAJE } from "@/lib/mensajes-datos";

const AVISOS: Record<string, [string, "ok" | "error"]> = {
  ok: ["Enviamos tu mensaje.", "ok"],
  vacio: ["Escribe algo antes de enviar.", "error"],
  largo: [`El mensaje es muy largo (máximo ${MAX_MENSAJE} caracteres).`, "error"],
  limite: ["Enviaste muchos mensajes seguidos. Prueba más tarde.", "error"],
};

export function HiloMensajes({
  mensajes,
  yo,
  otro,
  accion,
  ocultos,
  estado,
  escrituraDisponible = true,
  id = "t-mensajes",
}: {
  mensajes: Mensaje[];
  yo: Autor;
  otro: string;
  accion: (fd: FormData) => Promise<void>;
  ocultos: Record<string, string | number>;
  estado?: string;
  escrituraDisponible?: boolean;
  id?: string;
}) {
  const aviso = estado ? AVISOS[estado] : undefined;
  return (
    <section className="hilo" id={id} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>Mensajes con {otro}</h2>
      {aviso ? <p className={`aviso aviso-${aviso[1]}`} role={aviso[1] === "error" ? "alert" : "status"}>{aviso[0]}</p> : null}
      {mensajes.length === 0 ? (
        <p className="hilo-vacio">
          {escrituraDisponible ? `Aún no hay mensajes. Escribe el primero: ${otro} recibirá un aviso por correo.` : "Aún no hay mensajes."}
        </p>
      ) : (
        <ol className="hilo-lista" aria-live="polite">
          {mensajes.map((m) => (
            <li key={m.id} className={m.de === yo ? "hilo-msg mio" : "hilo-msg suyo"}>
              <p className="hilo-texto">{m.texto}</p>
              <span className="hilo-meta">
                {m.de === yo ? "Tú" : otro} · {fechaHora(m.creadoEn)}
                {m.de === yo && m.leido ? " · leído" : ""}
              </span>
            </li>
          ))}
        </ol>
      )}
      {escrituraDisponible ? (
        <form action={accion} className="hilo-form">
          {Object.entries(ocultos).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <label className="hilo-campo">
            <span>Tu mensaje</span>
            <textarea name="texto" rows={3} maxLength={MAX_MENSAJE} required placeholder="Escribe aquí…" />
          </label>
          <p className="hilo-ayuda">No pongas claves ni números de tarjeta. Los mensajes se guardan cifrados.</p>
          <button type="submit" className="btn btn-primario btn-chico">Enviar mensaje</button>
        </form>
      ) : null}
    </section>
  );
}
