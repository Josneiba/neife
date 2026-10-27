"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { BotonEnviar } from "./BotonEnviar";
import { ingresar, registrarAbogado, registrarCliente } from "@/lib/acciones/auth";
import { crearSolicitud } from "@/lib/acciones/solicitudes";
import { guardarPerfil } from "@/lib/acciones/panel";
import { pedirRecuperacion, restablecerClave } from "@/lib/acciones/recuperar";
import { importarLeyChile } from "@/lib/acciones/admin";
import type { EstadoForm } from "@/lib/validators";
import { MATERIAS, PRESUPUESTOS, REGIONES, URGENCIAS } from "@/lib/materias";
import Link from "next/link";

const VACIO: EstadoForm = {};

export function BarraIndeterminada({ texto }: { texto: string }) {
  return (
    <div role="status" aria-live="polite">
      <div className="barra-ind" aria-hidden="true" />
      <p className="ayuda">{texto}</p>
    </div>
  );
}

/**
 * Envía el formulario a una acción del servidor SIN que React lo reinicie al terminar.
 * (Con action={...} React borra los campos, incluidos los menús, aunque haya un error de llenado.)
 */
function useAccionForm(accion: (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>) {
  const segura = async (prev: EstadoForm, fd: FormData): Promise<EstadoForm> => {
    try {
      return await accion(prev, fd);
    } catch (e) {
      // redirect() de Next sale como excepción: hay que dejarlo pasar.
      if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) throw e;
      const valores: Record<string, string> = {};
      fd.forEach((v, k) => {
        if (typeof v === "string" && !/clave|repetir/.test(k)) valores[k] = v;
      });
      return { error: "Se cortó la conexión y no pudimos enviar. Revisa tu internet y vuelve a intentar: lo que escribiste sigue aquí.", valores };
    }
  };
  const [estado, ejecutar, pendiente] = useActionState(segura, VACIO);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(() => ejecutar(datos));
  };
  return { estado, onSubmit, pendiente };
}

/* ---------- Piezas comunes ---------- */

function Campo({
  id,
  label,
  ayuda,
  error,
  children,
}: {
  id: string;
  label: string;
  ayuda?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="campo">
      <label htmlFor={id}>{label}</label>
      {ayuda ? (
        <p className="ayuda" id={`${id}-ayuda`}>
          {ayuda}
        </p>
      ) : null}
      {children}
      {error ? (
        <p className="error-campo" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function descripcion(id: string, ayuda?: string, error?: string) {
  const ids = [ayuda ? `${id}-ayuda` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ");
  return { "aria-describedby": ids || undefined, "aria-invalid": error ? true : undefined } as const;
}

function Texto({
  id,
  label,
  estado,
  tipo = "text",
  ayuda,
  autoComplete,
  requerido = true,
  maxLength,
  valor,
}: {
  id: string;
  label: string;
  estado: EstadoForm;
  tipo?: string;
  ayuda?: string;
  autoComplete?: string;
  requerido?: boolean;
  maxLength?: number;
  valor?: string;
}) {
  const error = estado.errores?.[id];
  return (
    <Campo id={id} label={label} ayuda={ayuda} error={error}>
      <input
        id={id}
        name={id}
        type={tipo}
        className="entrada"
        defaultValue={tipo === "password" ? undefined : (estado.valores?.[id] ?? valor ?? "")}
        autoComplete={autoComplete}
        required={requerido}
        maxLength={maxLength}
        {...descripcion(id, ayuda, error)}
      />
    </Campo>
  );
}

function Mensajes({ estado }: { estado: EstadoForm }) {
  return (
    <>
      {estado.error ? (
        <div className="aviso aviso-error" role="alert">
          {estado.error}
        </div>
      ) : null}
      {estado.ok ? (
        <div className="aviso aviso-ok" role="status">
          {estado.ok}
        </div>
      ) : null}
    </>
  );
}

/* ---------- Ingreso y registro ---------- */

export function FormIngresar({ siguiente }: { siguiente?: string }) {
  const { estado, onSubmit, pendiente } = useAccionForm(ingresar);
  return (
    <form onSubmit={onSubmit} className="formulario" noValidate>
      <Mensajes estado={estado} />
      {siguiente ? <input type="hidden" name="siguiente" value={siguiente} /> : null}
      <Texto id="email" label="Correo" tipo="email" estado={estado} autoComplete="email" />
      <Texto id="clave" label="Contraseña" tipo="password" estado={estado} autoComplete="current-password" />
      <div className="botones">
        <BotonEnviar pendiente={pendiente} enviando="Ingresando…">Ingresar</BotonEnviar>
      </div>
    </form>
  );
}

export function FormPedirRecuperacion() {
  const { estado, onSubmit, pendiente } = useAccionForm(pedirRecuperacion);
  return (
    <form onSubmit={onSubmit} className="formulario" noValidate>
      <Mensajes estado={estado} />
      <Texto id="email" label="Correo de tu cuenta" tipo="email" estado={estado} autoComplete="email" />
      <div className="botones">
        <BotonEnviar pendiente={pendiente} enviando="Enviando…">Enviar enlace</BotonEnviar>
      </div>
    </form>
  );
}

export function FormNuevaClave({ token }: { token: string }) {
  const { estado, onSubmit, pendiente } = useAccionForm(restablecerClave);
  return (
    <form onSubmit={onSubmit} className="formulario" noValidate>
      <Mensajes estado={estado} />
      <input type="hidden" name="token" value={token} />
      <Texto id="clave" label="Nueva contraseña" tipo="password" estado={estado} autoComplete="new-password" ayuda="Mínimo 10 caracteres." />
      <Texto id="repetir" label="Repítela" tipo="password" estado={estado} autoComplete="new-password" />
      <div className="botones">
        <BotonEnviar pendiente={pendiente} enviando="Guardando…">Guardar contraseña</BotonEnviar>
      </div>
    </form>
  );
}

type PasoRegistro = { titulo: string; campos: string[]; contenido: ReactNode };

/** Formulario en pasos: de a pocos datos por pantalla. Todos los campos siguen en el mismo formulario. */
function Asistente({
  pasos,
  estado,
  onSubmit,
  pendiente,
  textoFinal,
  enviando,
  extra,
}: {
  pasos: PasoRegistro[];
  estado: EstadoForm;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  pendiente: boolean;
  textoFinal: string;
  enviando: string;
  extra?: ReactNode;
}) {
  const [paso, setPaso] = useState(0);
  const [aviso, setAviso] = useState("");
  const ref = useRef<HTMLFormElement>(null);

  // Si el servidor devuelve un error de un paso anterior, se vuelve a ese paso.
  useEffect(() => {
    const errores = estado.errores;
    if (!errores) return;
    const i = pasos.findIndex((p) => p.campos.some((c) => errores[c]));
    if (i >= 0) setPaso(i);
  }, [estado.errores]); // eslint-disable-line react-hooks/exhaustive-deps

  function siguiente() {
    const cont = ref.current?.querySelector<HTMLElement>(`[data-paso="${paso}"]`);
    const vacio = Array.from(cont?.querySelectorAll<HTMLInputElement>("input[name]:not([type=checkbox])") ?? []).find((i) => !i.value.trim());
    if (vacio) {
      setAviso("Completa este dato para seguir.");
      vacio.focus();
      return;
    }
    setAviso("");
    setPaso(paso + 1);
  }

  const ultimo = paso === pasos.length - 1;
  return (
    <form ref={ref} onSubmit={onSubmit} className="formulario asistente" noValidate>
      <div className="asistente-cab" aria-live="polite">
        <span>Paso {paso + 1} de {pasos.length}</span>
        <strong>{pasos[paso].titulo}</strong>
        <span className="asistente-barra" aria-hidden="true">
          {pasos.map((_, i) => <span key={i} className={i <= paso ? "on" : ""} />)}
        </span>
      </div>
      <Mensajes estado={estado} />
      {pasos.map((p, i) => (
        <div key={p.titulo} data-paso={i} hidden={i !== paso} className="asistente-paso">
          {p.contenido}
        </div>
      ))}
      {aviso ? <p className="error-campo" role="alert">{aviso}</p> : null}
      {ultimo ? extra : null}
      <div className="botones">
        {paso > 0 ? (
          <button type="button" className="btn btn-secundario" onClick={() => { setAviso(""); setPaso(paso - 1); }}>Atrás</button>
        ) : null}
        {ultimo ? (
          <BotonEnviar pendiente={pendiente} enviando={enviando}>{textoFinal}</BotonEnviar>
        ) : (
          <button type="button" className="btn btn-primario" onClick={siguiente}>Siguiente</button>
        )}
      </div>
    </form>
  );
}

export function FormRegistroCliente() {
  const { estado, onSubmit, pendiente } = useAccionForm(registrarCliente);
  return (
    <Asistente
      estado={estado}
      onSubmit={onSubmit}
      pendiente={pendiente}
      textoFinal="Crear cuenta"
      enviando="Creando cuenta…"
      pasos={[
        {
          titulo: "Tus datos",
          campos: ["nombre", "email"],
          contenido: (
            <>
              <Texto id="nombre" label="Nombre" estado={estado} autoComplete="name" />
              <Texto id="email" label="Correo" tipo="email" estado={estado} autoComplete="email" />
            </>
          ),
        },
        {
          titulo: "Tu contraseña",
          campos: ["clave"],
          contenido: <Texto id="clave" label="Contraseña" tipo="password" estado={estado} autoComplete="new-password" ayuda="Mínimo 10 caracteres." />,
        },
      ]}
    />
  );
}

export function FormRegistroAbogado() {
  const { estado, onSubmit, pendiente } = useAccionForm(registrarAbogado);
  const errorDeclaracion = estado.errores?.declaracion;
  return (
    <Asistente
      estado={estado}
      onSubmit={onSubmit}
      pendiente={pendiente}
      textoFinal="Crear cuenta de asesor"
      enviando="Enviando…"
      extra={
        <div className="aviso">
          Revisamos cada cuenta de asesor antes de activarla. Mientras tanto puedes ingresar, pero tu perfil no será público.
        </div>
      }
      pasos={[
        {
          titulo: "Tus datos",
          campos: ["nombre", "email"],
          contenido: (
            <>
              <Texto id="nombre" label="Nombre completo" estado={estado} autoComplete="name" />
              <Texto id="email" label="Correo" tipo="email" estado={estado} autoComplete="email" />
            </>
          ),
        },
        {
          titulo: "Tu contraseña",
          campos: ["clave"],
          contenido: <Texto id="clave" label="Contraseña" tipo="password" estado={estado} autoComplete="new-password" ayuda="Mínimo 10 caracteres." />,
        },
        {
          titulo: "Tu perfil profesional",
          campos: ["titulo", "registro", "declaracion"],
          contenido: (
            <>
              <Texto id="titulo" label="Tu condición profesional" estado={estado} ayuda="Lo que eres hoy, sin adornos. Ej.: Abogada, o Estudiante de Derecho." />
              <Texto id="registro" label="Número de colegiatura o universidad" estado={estado} ayuda="Solo para verificar tu cuenta. No se muestra en tu perfil público." />
              <div className="campo">
                <label className="opcion">
                  <input type="checkbox" name="declaracion" aria-invalid={errorDeclaracion ? true : undefined} />
                  <span>Declaro que estos datos son verdaderos y que presto orientación general, no representación legal.</span>
                </label>
                {errorDeclaracion ? <p className="error-campo" role="alert">{errorDeclaracion}</p> : null}
              </div>
            </>
          ),
        },
      ]}
    />
  );
}

/* ---------- Solicitud de asesoría ---------- */

export function FormSolicitud({
  asesores,
  asesorInicial,
  nombre,
  email,
  fijo,
}: {
  asesores: { id: number; nombre: string }[];
  asesorInicial?: number;
  nombre?: string;
  email?: string;
  /** Datos del caso ya ingresados en el paso anterior. */
  fijo?: { materia: string; region: string; relato: string };
}) {
  const { estado, onSubmit, pendiente } = useAccionForm(crearSolicitud);
  const [largo, setLargo] = useState(estado.valores?.relato?.length ?? 0);
  const v = estado.valores ?? {};
  const e = estado.errores ?? {};
  const asesorElegido = v.asesor ?? String(asesorInicial ?? "auto");

  return (
    <form onSubmit={onSubmit} className="formulario" noValidate>
      <Mensajes estado={estado} />

      {asesores.length === 1 ? (
        <input type="hidden" name="asesor" value={asesores[0].id} />
      ) : (
        <Campo id="asesor" label="¿Con quién quieres hablar?" ayuda="Si no tienes preferencia, lo asignamos según disponibilidad." error={e.asesor}>
          <select id="asesor" name="asesor" className="entrada" defaultValue={asesorElegido} required {...descripcion("asesor", undefined, e.asesor)}>
            <option value="auto">Asignar automáticamente</option>
            {asesores.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </Campo>
      )}

      {fijo ? (
        <>
          <input type="hidden" name="materia" value={fijo.materia} />
          <input type="hidden" name="region" value={fijo.region} />
          <input type="hidden" name="relato" value={fijo.relato} />
          {e.materia || e.region || e.relato ? (
            <p className="error-campo" role="alert">
              {e.materia || e.region || e.relato}
            </p>
          ) : null}
        </>
      ) : (
        <>
      <div className="fila-dos">
        <Campo id="materia" label="¿Sobre qué es tu caso?" error={e.materia}>
          <select id="materia" name="materia" className="entrada" defaultValue={v.materia ?? ""} required {...descripcion("materia", undefined, e.materia)}>
            <option value="">Elige una materia</option>
            {MATERIAS.map((m) => (
              <option key={m.clave} value={m.clave}>
                {m.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="region" label="¿En qué región ocurre?" error={e.region}>
          <select id="region" name="region" className="entrada" defaultValue={v.region ?? ""} required {...descripcion("region", undefined, e.region)}>
            <option value="">Elige una región</option>
            {REGIONES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <Campo
        id="relato"
        label="¿Qué pasó?"
        ayuda="Cuéntalo con fechas aproximadas y lo más importante. No escribas RUT, direcciones ni nombres completos: tus datos de contacto van más abajo."
        error={e.relato}
      >
        <textarea
          id="relato"
          name="relato"
          className="entrada"
          defaultValue={v.relato ?? ""}
          maxLength={1500}
          required
          onInput={(ev) => setLargo(ev.currentTarget.value.length)}
          {...descripcion("relato", "x", e.relato)}
        />
        <p className="ayuda" aria-live="polite">
          {largo} de 1500 caracteres
        </p>
      </Campo>

        </>
      )}

      <fieldset className="campo">
        <legend className="campo-titulo">Urgencia</legend>
        <div className="opciones">
          {URGENCIAS.map((u) => (
            <label key={u.clave} className="opcion">
              <input type="radio" name="urgencia" value={u.clave} defaultChecked={(v.urgencia ?? "normal") === u.clave} />
              <span>{u.nombre}</span>
            </label>
          ))}
        </div>
        {e.urgencia ? <p className="error-campo">{e.urgencia}</p> : null}
      </fieldset>

      <Campo id="presupuesto" label="Presupuesto (opcional)" error={e.presupuesto} ayuda="Solo de referencia. Puedes dejarlo en blanco.">
        <select id="presupuesto" name="presupuesto" className="entrada" defaultValue={v.presupuesto ?? ""} {...descripcion("presupuesto", "x", e.presupuesto)}>
          <option value="">Prefiero no indicarlo</option>
          {PRESUPUESTOS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </Campo>

      <div className="fila-dos">
        <Texto id="nombre" label="Tu nombre" estado={estado} autoComplete="name" valor={nombre} />
        <Texto id="email" label="Tu correo" tipo="email" estado={estado} autoComplete="email" valor={email} />
      </div>
      <Texto
        id="telefono"
        label="Teléfono o WhatsApp (opcional)"
        tipo="tel"
        estado={estado}
        autoComplete="tel"
        requerido={false}
        ayuda="Para que el asesor te escriba por ahí."
      />

      <div className="trampa" aria-hidden="true">
        <label>
          No llenes este campo
          <input type="text" name="web" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="campo" style={{ display: "grid", gap: 10 }}>
        <label className="opcion">
          <input type="checkbox" name="consentimiento" defaultChecked={v.consentimiento === "on"} aria-invalid={e.consentimiento ? true : undefined} />
          <span>
            Acepto los Términos y condiciones y la Política de privacidad, y autorizo el tratamiento de mis datos para
            gestionar esta solicitud. La autorización para compartir mi informe y conservar mis datos se solicita por separado.
          </span>
        </label>
        <p className="ayuda">
          Lee los <Link href="/terminos">Términos y condiciones</Link> y la <Link href="/privacidad">Política de privacidad</Link>.
        </p>
        {e.consentimiento ? (
          <p className="error-campo" role="alert">
            {e.consentimiento}
          </p>
        ) : null}
        <label className="opcion">
          <input type="checkbox" name="derivar" defaultChecked={v.derivar === "on"} />
          <span>Si corresponde, autorizo que mi informe se comparta con un abogado del rubro.</span>
        </label>
        <label className="opcion">
          <input type="checkbox" name="conservar" defaultChecked={v.conservar === "on"} />
          <span>
            Quiero que guarden mis datos después de la asesoría, para ayudarme de nuevo. Si no lo marcas, se anonimizarán
            después de 15 días desde el cierre, rechazo o derivación confirmada. Puedes cambiar esta decisión o pedir el
            borrado desde tu enlace de seguimiento.
          </span>
        </label>
      </div>

      <div className="botones">
        <BotonEnviar pendiente={pendiente} enviando="Enviando…">Pedir contacto con el asesor</BotonEnviar>
      </div>
    </form>
  );
}

/* ---------- Perfil del asesor ---------- */

export function FormPerfil({
  inicial,
}: {
  inicial: {
    nombre: string;
    titulo: string;
    registro: string;
    ubicacion: string;
    bio: string;
    precioInforme: number;
    metaSemanal?: number;
    instruccionesPago: string;
    materias: string[];
    publicado: boolean;
  };
}) {
  const { estado, onSubmit, pendiente } = useAccionForm(guardarPerfil);
  const v = estado.valores ?? {};
  const materias = v.materias !== undefined ? v.materias.split(",") : inicial.materias;
  const e = estado.errores ?? {};
  return (
    <form onSubmit={onSubmit} className="formulario formulario-panel" noValidate>
      <Mensajes estado={estado} />
      <div className="fila-dos">
        <Texto id="nombre" label="Nombre público" estado={estado} valor={inicial.nombre} />
        <Texto id="titulo" label="Condición profesional" estado={estado} valor={inicial.titulo} ayuda="Escribe lo que eres hoy, por ejemplo: Abogado, o Estudiante de Derecho." />
      </div>
      <Texto id="registro" label="Número de colegiatura o universidad" estado={estado} valor={inicial.registro} ayuda="Solo lo ve el equipo de Neife para verificarte." />
      <Texto id="ubicacion" label="Dónde atiendes" estado={estado} requerido={false} valor={inicial.ubicacion} ayuda="Por ejemplo: Región Metropolitana, atención online." />

      <fieldset className="campo">
        <legend className="campo-titulo">Materias que orientas</legend>
        <div className="opciones-fila">
          {MATERIAS.map((m) => (
            <label key={m.clave} className="opcion">
              <input type="checkbox" name={`materia_${m.clave}`} defaultChecked={materias.includes(m.clave)} />
              <span>{m.nombre}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Campo id="bio" label="Presentación" ayuda="Quién eres y cómo trabajas. Máximo 900 caracteres." error={e.bio}>
        <textarea id="bio" name="bio" className="entrada" defaultValue={v.bio ?? inicial.bio} maxLength={900} {...descripcion("bio", "x", e.bio)} />
      </Campo>

      <Campo id="precio_informe" label="Precio del informe (CLP)" error={e.precio_informe} ayuda="Escribe 0 si el informe es gratis.">
        <input
          id="precio_informe"
          name="precio_informe"
          type="number"
          min={0}
          step={500}
          className="entrada"
          defaultValue={v.precio_informe ?? inicial.precioInforme}
          required
          {...descripcion("precio_informe", "x", e.precio_informe)}
        />
      </Campo>

      <Campo id="meta_semanal" label="Meta de clientes por semana" error={e.meta_semanal} ayuda="Clientes con abogado confirmado. Se muestra en tu tablero.">
        <input id="meta_semanal" name="meta_semanal" type="number" min={1} max={100} className="entrada" defaultValue={v.meta_semanal ?? inicial.metaSemanal ?? 3} {...descripcion("meta_semanal", "x", e.meta_semanal)} />
      </Campo>

      <Campo id="instrucciones_pago" label="Instrucciones de pago" error={e.instrucciones_pago} ayuda="Se muestran a la persona cuando aceptas su solicitud. Por ejemplo: datos de transferencia.">
        <textarea
          id="instrucciones_pago"
          name="instrucciones_pago"
          className="entrada"
          style={{ minHeight: 90 }}
          defaultValue={v.instrucciones_pago ?? inicial.instruccionesPago}
          maxLength={600}
          {...descripcion("instrucciones_pago", "x", e.instrucciones_pago)}
        />
      </Campo>

      <label className="opcion">
        <input type="checkbox" name="publicado" defaultChecked={estado.valores ? v.publicado === "on" : inicial.publicado} />
        <span>Mostrar mi perfil en la página de Asesoría</span>
      </label>

      <div className="botones">
        <BotonEnviar pendiente={pendiente} enviando="Guardando…">Guardar cambios</BotonEnviar>
      </div>
    </form>
  );
}

/* ---------- Subir norma (administrador) ---------- */

export function FormImportarLey({ habituales }: { habituales: { id: string; nombre: string; materia: string }[] }) {
  const { estado, onSubmit, pendiente } = useAccionForm(importarLeyChile);
  const [entrada, setEntrada] = useState("");
  const [materia, setMateria] = useState("");
  const e = estado.errores ?? {};
  return (
    <form onSubmit={onSubmit} className="formulario formulario-panel" noValidate>
      <Mensajes estado={estado} />
      <div className="fila-dos">
        <Campo id="entrada" label="Número de norma o enlace de LeyChile" error={e.entrada} ayuda="Está en la dirección: leychile.cl/Navegar?idNorma=207436">
          <input id="entrada" name="entrada" className="entrada" value={entrada} onChange={(ev) => setEntrada(ev.target.value)} inputMode="url" {...descripcion("entrada", "x", e.entrada)} />
        </Campo>
        <Campo id="materia-ley" label="Materia" error={e.materia}>
          <select id="materia-ley" name="materia" className="entrada" value={materia} onChange={(ev) => setMateria(ev.target.value)}>
            <option value="">Elige una materia</option>
            {MATERIAS.map((m) => (
              <option key={m.clave} value={m.clave}>
                {m.nombre}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <div className="botones">
        <BotonEnviar pendiente={pendiente} enviando="Descargando…">
          Importar
        </BotonEnviar>
      </div>
      {pendiente ? <BarraIndeterminada texto="Descargando la norma desde LeyChile. Los códigos grandes pueden tardar hasta un minuto." /> : null}
      <div>
        <p className="ayuda" style={{ marginBottom: 6 }}>
          Normas habituales (elige una y pulsa Importar):
        </p>
        <div className="botones">
          {habituales.map((h) => (
            <button
              key={h.id}
              type="button"
              className="btn btn-secundario btn-chico"
              onClick={() => {
                setEntrada(h.id);
                setMateria(h.materia);
              }}
            >
              {h.nombre.length > 38 ? h.nombre.slice(0, 36) + "…" : h.nombre}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
