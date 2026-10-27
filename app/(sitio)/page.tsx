import Link from "next/link";
import { Icono, type NombreIcono } from "@/components/Iconos";
import { Pasos } from "@/components/Avance";
import { INICIO, SITIO } from "@/lib/contenido";

export default function Inicio() {
  return (
    <>
      <section className="contenedor inicio-hero" aria-labelledby="t-hero">
        <div className="inicio-hero-texto">
          <p className="etiqueta-sup">Orientación legal en Chile</p>
          <h1 id="t-hero">{INICIO.titulo}</h1>
          <p className="inicio-bajada">{INICIO.bajada}</p>
          <div className="botones">
            <Link href="/asesoria/solicitar" className="btn btn-primario">
              <Icono nombre="nota" tam={17} /> Contar mi caso
            </Link>
            <Link href="/registro?tipo=asesor" className="btn btn-secundario">
              Soy abogado o asesor
            </Link>
          </div>
          <p className="ayuda" style={{ marginTop: 14 }}>Sin cuenta. Orientación general, no reemplaza a un abogado.</p>
        </div>

        <aside className="inicio-vista" aria-label="Así se ve el seguimiento de tu caso">
          <div className="vista-cab">
            <span className="vista-folio">Solicitud 7K3M2QPX</span>
            <span className="vista-etq">Ejemplo</span>
          </div>
          <p className="vista-materia">Laboral · Región Metropolitana</p>
          <Pasos estado="informe" />
          <ul className="vista-lista">
            <li><Icono nombre="check" tam={15} /> Normas revisadas</li>
            <li><Icono nombre="circulo" tam={15} /> Falta: carta de despido y últimas 3 liquidaciones</li>
          </ul>
        </aside>
      </section>

      <section className="contenedor inicio-sec" aria-labelledby="t-sit">
        <h2 id="t-sit">¿Qué te pasó?</h2>
        <ul className="situaciones">
          {INICIO.situaciones.map((s) => (
            <li key={s.materia}>
              <Link href={`/asesoria/solicitar?materia=${s.materia}`}>
                <span>{s.texto}</span>
                <Icono nombre="flecha" tam={16} />
              </Link>
            </li>
          ))}
        </ul>
        <p className="ayuda">¿Otra cosa? <Link href="/asesoria/solicitar?materia=otra">Cuéntala igual</Link>.</p>
      </section>

      <section className="contenedor inicio-sec" id="como" aria-labelledby="t-como">
        <h2 id="t-como">Cómo funciona</h2>
        <ol className="inicio-pasos">
          {INICIO.pasos.map((p, i) => (
            <li key={p.titulo}>
              <span className="ip-num"><Icono nombre={p.icono as NombreIcono} tam={20} /></span>
              <h3>{i + 1}. {p.titulo}</h3>
              <p>{p.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="contenedor inicio-sec inicio-dos" aria-label="Para quién es">
        <div className="inicio-caja">
          <Icono nombre="usuario" tam={22} />
          <h2>{INICIO.personas.titulo}</h2>
          <ul className="lista-check">
            {INICIO.personas.puntos.map((t) => <li key={t}><Icono nombre="check" tam={16} />{t}</li>)}
          </ul>
          <Link href="/asesoria/solicitar" className="btn btn-primario">Contar mi caso</Link>
        </div>
        <div className="inicio-caja inicio-caja-oscura">
          <Icono nombre="casos" tam={22} />
          <h2>{INICIO.asesores.titulo}</h2>
          <ul className="lista-check">
            {INICIO.asesores.puntos.map((t) => <li key={t}><Icono nombre="check" tam={16} />{t}</li>)}
          </ul>
          <Link href="/registro?tipo=asesor" className="btn btn-claro">Crear cuenta de asesor</Link>
        </div>
      </section>

      <section className="contenedor inicio-sec inicio-datos" aria-labelledby="t-datos">
        <Icono nombre="escudo" tam={26} />
        <div>
          <h2 id="t-datos">{INICIO.privacidad.titulo}</h2>
          <p>{INICIO.privacidad.texto}</p>
          <p><Link href="/privacidad">Leer la política de privacidad</Link></p>
        </div>
      </section>

      <section className="contenedor inicio-sec" id="contacto" aria-labelledby="t-contacto">
        <h2 id="t-contacto">¿Dudas?</h2>
        <div className="contacto-fila">
          {SITIO.correoContacto ? (
            <a href={`mailto:${SITIO.correoContacto}`} className="btn btn-secundario">
              <Icono nombre="correo" tam={16} /> {SITIO.correoContacto}
            </a>
          ) : null}
          {SITIO.telefonoContacto ? <p>{SITIO.telefonoContacto}</p> : null}
          {!SITIO.correoContacto && !SITIO.telefonoContacto ? <p>El canal de contacto estará disponible pronto.</p> : null}
        </div>
      </section>
    </>
  );
}
