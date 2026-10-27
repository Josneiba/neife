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
  return (
    <div className="contenedor pagina-estrecha">
      <h1>Tu caso</h1>
      <p>Cuéntanos qué pasó y te mostramos las normas que podrían aplicar.</p>
      {!terminos.publicado ? (
        <div className="aviso aviso-espera" role="status" style={{ marginTop: 16 }}>
          Puedes revisar las normas sugeridas, pero el envío de solicitudes está temporalmente deshabilitado hasta que la
          administración complete y publique los <Link href="/terminos">Términos y condiciones</Link>.
        </div>
      ) : null}

      {asesores.length === 0 ? (
        <div className="aviso aviso-espera" style={{ marginTop: 28 }}>
          Por ahora no hay asesores disponibles. <Link href="/asesoria">Volver a Asesoría</Link>.
        </div>
      ) : (
        <>
          {!usuario ? (
            <p className="ayuda" style={{ marginTop: 10 }}>
              Con una cuenta sigues tus casos en un solo lugar: <Link href="/registro">crear cuenta</Link> o{" "}
              <Link href="/ingresar?siguiente=/asesoria/solicitar">ingresar</Link>. Es opcional.
            </p>
          ) : null}
          <FlujoOrientacion
            asesores={asesores.map((a) => ({ id: a.usuarioId, nombre: a.nombre }))}
            asesorInicial={asesorInicial}
            materiaInicial={materiaInicial}
            nombre={usuario?.rol === "cliente" ? usuario.nombre : undefined}
            email={usuario?.rol === "cliente" ? usuario.email : undefined}
          />
        </>
      )}
    </div>
  );
}
