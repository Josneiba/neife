import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonEnviar } from "@/components/BotonEnviar";
import { EditorInforme } from "@/components/EditorInforme";
import { Icono } from "@/components/Iconos";
import { requerirAbogado } from "@/lib/guards";
import { listarPendientes, obtenerInforme, obtenerSolicitudAsesor } from "@/lib/datos";
import { auditar } from "@/lib/db";
import { folio } from "@/lib/formato";
import { entregarInforme } from "@/lib/acciones/panel";

export const metadata: Metadata = { title: "Informe" };

export default async function DetalleInforme({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const u = await requerirAbogado();
  const { id: idTexto } = await params;
  const sp = await searchParams;
  const id = Number(idTexto);
  if (!Number.isInteger(id)) notFound();
  const informe = await obtenerInforme(id, u.id);
  if (!informe) notFound();
  const s = await obtenerSolicitudAsesor(informe.solicitudId, u.id);
  if (!s) notFound();
  const abiertos = (await listarPendientes(s.id)).filter((p) => !p.hecho).length;
  await auditar(u.id, "informe_visto", "informe", informe.id);

  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <h1>Informe {folio(s.codigo)}</h1>
          <span className="p-sub">
            <Link href={`/panel/solicitudes/${s.id}`}>Volver al caso</Link>
          </span>
        </div>
        <div className="p-acciones">
          {informe.entregado ? (
            <form action={entregarInforme}>
              <input type="hidden" name="id" value={informe.id} />
              <input type="hidden" name="entregar" value="0" />
              <BotonEnviar className="btn btn-secundario btn-chico" enviando="Retirando…">
                Retirar entrega
              </BotonEnviar>
            </form>
          ) : (
            <form action={entregarInforme}>
              <input type="hidden" name="id" value={informe.id} />
              <input type="hidden" name="entregar" value="1" />
              <BotonEnviar className="btn btn-primario btn-chico" enviando="Entregando…">
                <Icono nombre="enviar" tam={15} /> Entregar a la persona
              </BotonEnviar>
            </form>
          )}
        </div>
      </header>

      {sp.aviso === "final" && informe.estado !== "final" ? (
        <div className="aviso aviso-espera" role="status" style={{ margin: "12px 28px 0" }}>
          Marca el informe como final antes de entregarlo.
        </div>
      ) : null}
      {informe.entregado ? (
        <div className="aviso aviso-ok" role="status" style={{ margin: "12px 28px 0" }}>
          Entregado a {s.nombre}. Si lo editas, la persona descargará la última versión guardada.
        </div>
      ) : null}

      <EditorInforme informeId={informe.id} estado={informe.estado} inicial={informe.contenido} pendientesAbiertos={abiertos} />
    </>
  );
}
