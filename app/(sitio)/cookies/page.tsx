import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de cookies" };

export default function Cookies() {
  return (
    <div className="contenedor pagina-estrecha" style={{ maxWidth: 720 }}>
      <h1>Política de cookies</h1>
      <p className="legal-intro">
        En la versión actual, Neife utiliza únicamente cookies técnicas necesarias para autenticación y seguridad. No utiliza
        cookies propias de analítica ni publicidad.
      </p>
      <article className="documento-legal">
        <h2>Cookies usadas por Neife</h2>
        <div className="tabla-cookies">
          <div className="fila-cookie fila-cookie-titulo" aria-hidden="true">
            <span>Nombre</span><span>Finalidad</span><span>Duración</span>
          </div>
          <div className="fila-cookie">
            <strong>neife_sesion</strong>
            <span>Mantener iniciada la sesión y comprobar la identidad de la cuenta.</span>
            <span>Hasta 7 días; se elimina al cerrar sesión o al vencer.</span>
          </div>
          <div className="fila-cookie">
            <strong>neife_oauth</strong>
            <span>Proteger temporalmente el inicio de sesión con Google (estado y PKCE contra falsificación de solicitudes).</span>
            <span>Hasta 10 minutos; solo durante el flujo de autenticación.</span>
          </div>
        </div>
        <p>
          Ambas son cookies propias, HTTP-only y SameSite=Lax; en producción se envían con la marca Secure. La cookie de OAuth
          se limita a la ruta de autenticación. No se utilizan para publicidad ni para seguimiento entre sitios.
        </p>

        <h2>Servicios de terceros</h2>
        <p>
          Si eliges “Continuar con Google”, Google puede utilizar sus propias cookies al visitar sus páginas de autenticación.
          Estas cookies son gestionadas por Google y se rigen por sus avisos de privacidad y cookies. Neife no las puede leer.
        </p>

        <h2>Almacenamiento del navegador y preferencias</h2>
        <p>
          No se guarda una preferencia de cookies: las cookies descritas son necesarias para prestar las funciones que solicitas.
          Si en el futuro se añaden cookies no esenciales, se actualizará este inventario y se solicitará el consentimiento que
          corresponda antes de activarlas.
        </p>

        <h2>Cómo gestionar cookies</h2>
        <p>
          Puedes bloquear o borrar cookies desde la configuración de tu navegador. Si bloqueas las cookies técnicas, no podrás
          iniciar o mantener una sesión ni completar el acceso con Google.
        </p>
      </article>
    </div>
  );
}
