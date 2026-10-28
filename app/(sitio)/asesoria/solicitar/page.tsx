import type { Metadata } from "next";
import Link from "next/link";
import { FlujoOrientacion } from "@/components/FlujoOrientacion";
import { listarAsesoresPublicos } from "@/lib/datos";
import { usuarioActual } from "@/lib/auth";
import { esMateria } from "@/lib/materias";
import { leerTerminos } from "@/lib/terminos";

export const metadata: Metadata = { title: "Ver normas aplicables" };
export const dynamic = "force-dynamic";

export default async function Solicitar({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const asesores = await listarAsesoresPublicos();
  const usuario = await usuarioActual();
  const terminos = await leerTerminos();
  const pedido = Number(Array.isArray(sp.asesor) ? sp.asesor[0] : sp.asesor);
  const asesorInicial = asesores.some((a) => a.usuarioId === pedido) ? pedido : undefined;

  const m = Array.isArray(sp.materia) ? sp.materia[0] : sp.materia;
  const materiaInicial = m && esMateria(m) ? m : "";
  const puedeSolicitar = asesores.length > 0 && terminos.publicado;
  const motivoSolicitud = asesores.length === 0
    ? "Por ahora no hay asesores disponibles para recibir una solicitud. Puedes revisar las sugerencias de normas y volver más tarde."
    : "El envío de solicitudes está temporalmente deshabilitado hasta que la administración complete y publique los Términos y condiciones.";
  return (
    <div className="contenedor pagina-estrecha">
      <h1>Tu caso</h1>
      <p>Cuéntanos qué pasó y te mostramos las normas que podrían aplicar.</p>
      {!puedeSolicitar ? (
        <div className="aviso aviso-espera" role="status" style={{ marginTop: 16 }}>
          <strong>Puedes escribir tu caso en el formulario de abajo y revisar normas sugeridas.</strong>{" "}
          Para enviar una solicitud de asesoría, primero deben publicarse los <Link href="/terminos">Términos y condiciones</Link>
          {asesores.length === 0 ? " y habilitarse al menos un asesor." : "."}
        </div>
      ) : null}
      {!usuario && puedeSolicitar ? (
        <p className="ayuda" style={{ marginTop: 10 }}>
          Con una cuenta sigues tus casos en un solo lugar: <Link href="/registro">crear cuenta</Link> o{" "}
          <Link href="/ingresar?siguiente=/asesoria/solicitar">ingresar</Link>. Es opcional.
        </p>
      ) : null}
      <h2 style={{ marginTop: 28, fontSize: "1.25rem" }}>Cuéntanos qué pasó</h2>
      <p className="ayuda" style={{ marginTop: 4 }}>
        Completa la materia, tu región y el relato. La consulta de normas no se guarda.
      </p>
      <FlujoOrientacion
        asesores={asesores.map((a) => ({ id: a.usuarioId, nombre: a.nombre }))}
        puedeSolicitar={puedeSolicitar}
        motivoSolicitud={motivoSolicitud}
        asesorInicial={asesorInicial}
        materiaInicial={materiaInicial}
        nombre={usuario?.rol === "cliente" ? usuario.nombre : undefined}
        email={usuario?.rol === "cliente" ? usuario.email : undefined}
      />
    </div>
  );
}
