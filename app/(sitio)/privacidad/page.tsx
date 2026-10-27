import type { Metadata } from "next";
import Link from "next/link";
import { SITIO } from "@/lib/contenido";

export const metadata: Metadata = { title: "Privacidad y datos personales" };

export default async function Privacidad({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return (
    <div className="contenedor pagina-estrecha" style={{ maxWidth: 720 }}>
      <h1>Privacidad y datos personales</h1>
      {sp.borrado ? (
        <div className="aviso aviso-ok" role="status" style={{ marginTop: 20 }}>
          <strong>Listo.</strong> Borramos tu solicitud y todo lo que estaba asociado a ella.
        </div>
      ) : null}
      <div className="aviso aviso-espera legal-aviso">
        Antes de abrir el servicio al público, quien opera Neife debe completar y verificar su identificación legal, domicilio,
        correo de contacto y los proveedores efectivamente habilitados.
      </div>
      <article className="documento-legal">
        <h2>Responsable y contacto</h2>
        <p>
          El servicio se presenta como Neife. La razón social o nombre legal, RUT y domicilio del responsable deben quedar
          identificados en los <Link href="/terminos">Términos y condiciones</Link> antes de su publicación definitiva.
          {SITIO.correoContacto ? (
            <> Para consultas de privacidad puedes escribir a <a href={`mailto:${SITIO.correoContacto}`}>{SITIO.correoContacto}</a>.</>
          ) : (
            <> El correo de contacto se debe configurar antes de la puesta en producción.</>
          )}
        </p>

        <h2>Datos que tratamos</h2>
        <p>
          Para una solicitud podemos tratar nombre, correo, teléfono opcional, relato del caso, materia, región, urgencia,
          presupuesto, comunicaciones y el informe asociado. Si creas una cuenta, tratamos además correo, nombre, credenciales
          protegidas y datos del perfil. También se generan registros técnicos y de seguridad necesarios para operar el servicio.
          Evita incluir datos sensibles o de terceras personas que no sean necesarios.
        </p>

        <h2>Finalidades y fundamento</h2>
        <p>
          Usamos los datos para recibir y gestionar la solicitud, contactar a la persona, asignar un asesor, preparar y entregar
          el informe que se pidió, mantener cuentas y sesiones, proteger el servicio, atender solicitudes de privacidad y cumplir
          obligaciones legales. El formulario informa estas finalidades y requiere autorización para el tratamiento de la
          solicitud; compartir un informe con un abogado y conservar datos tras terminar son opciones separadas.
        </p>

        <h2>Con quién se comparten</h2>
        <p>
          La solicitud se entrega al asesor asignado para prestar el servicio. Un informe solo se deriva a un abogado cuando la
          persona lo autoriza. Proveedores de infraestructura, base de datos, correo electrónico o autenticación pueden tratar
          datos por cuenta del servicio, según las funciones habilitadas. La puesta en producción debe identificar los proveedores
          y las ubicaciones de tratamiento efectivamente configurados; entre las integraciones opcionales previstas están
          Supabase/PostgreSQL, Vercel, Resend y Google OAuth. No vendemos datos personales.
        </p>

        <h2>Protección y conservación</h2>
        <p>
          Los datos de las solicitudes y credenciales se protegen mediante cifrado o mecanismos de protección adecuados al tipo
          de dato; las contraseñas no se almacenan en texto legible. Cuando un caso termina, si la persona no pidió conservar
          sus datos, el sistema espera 15 días para permitir descargar el informe y luego anonimiza los datos identificables.
          Si pidió conservarlos, puede cambiar su decisión o solicitar el borrado desde el enlace de seguimiento. Las solicitudes
          cerradas o rechazadas también están sujetas a eliminación programada después de 12 meses desde su última actualización.
        </p>

        <h2>Tus derechos y solicitudes</h2>
        <p>
          Puedes solicitar información sobre tus datos, pedir que se corrijan o eliminarlos cuando corresponda. Para borrar un
          caso, usa la opción del enlace de seguimiento; para otras solicitudes, escribe al correo de contacto señalado arriba.
          Responderemos conforme a los plazos y procedimientos que establezca la ley aplicable. La normativa principal es la{" "}
          <a href="https://www.bcn.cl/leychile/navegar?idNorma=141599" target="_blank" rel="noreferrer">Ley 19.628</a>.
          La Ley 21.719 fue publicada el 13 de diciembre de 2024 y sus modificaciones indicadas en el artículo primero transitorio
          entran en vigor el 1 de diciembre de 2026; revisa su{" "}
          <a href="https://www.bcn.cl/leychile/navegar?idNorma=1209272" target="_blank" rel="noreferrer">texto oficial</a>.
        </p>

        <h2>Cambios y consultas</h2>
        <p>
          Publicaremos aquí cualquier cambio relevante a esta política. Puedes consultar también los{" "}
          <Link href="/terminos">Términos y condiciones</Link> y la <Link href="/cookies">Política de cookies</Link>.
          {SITIO.correoContacto ? <> Contacto: <a href={`mailto:${SITIO.correoContacto}`}>{SITIO.correoContacto}</a>.</> : null}
        </p>
      </article>
    </div>
  );
}
