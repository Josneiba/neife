import type { Metadata } from "next";
import Link from "next/link";
import { Etiqueta } from "@/components/Etiqueta";
import { requerirAbogado } from "@/lib/guards";
import { listarInformesAsesor } from "@/lib/datos";
import { fechaCorta, folio } from "@/lib/formato";
import { nombreMateria } from "@/lib/materias";

export const metadata: Metadata = { title: "Informes" };

export default async function Informes() {
  const u = await requerirAbogado();
  const lista = await listarInformesAsesor(u.id);
  return (
    <>
      <header className="p-cab">
        <div className="p-cab-izq">
          <h1>Informes</h1>
        </div>
      </header>
      {lista.length === 0 ? (
        <p className="p-vacio">
          Aún no hay informes. Se preparan desde un caso aceptado. <Link href="/panel">Ir a casos</Link>
        </p>
      ) : (
        <table className="p-tabla">
          <thead>
            <tr>
              <th scope="col">Caso</th>
              <th scope="col">Materia</th>
              <th scope="col">Estado</th>
              <th scope="col">Entrega</th>
              <th scope="col">Editado</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((i) => (
              <tr key={i.id}>
                <td className="num">
                  <Link className="folio" href={`/panel/informes/${i.id}`}>
                    {folio(i.codigo)}
                  </Link>
                </td>
                <td>{nombreMateria(i.materia)}</td>
                <td>
                  <Etiqueta estado={i.estado} />
                </td>
                <td>{i.entregado ? <Etiqueta estado="entregada" texto="Entregado" /> : "Sin entregar"}</td>
                <td className="num">{fechaCorta(i.actualizadoEn)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
