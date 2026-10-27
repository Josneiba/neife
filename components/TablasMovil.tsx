"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * En el teléfono las tablas se apilan como fichas. Para que cada dato conserve su título,
 * copia el texto de cada encabezado a las celdas de su columna (el CSS lo muestra solo en pantallas chicas).
 */
export function TablasMovil() {
  const ruta = usePathname();
  useEffect(() => {
    document.querySelectorAll<HTMLTableElement>("table.p-tabla").forEach((t) => {
      const titulos = Array.from(t.querySelectorAll("thead th")).map((th) => th.textContent?.trim() ?? "");
      t.querySelectorAll("tbody tr").forEach((tr) => {
        Array.from(tr.children).forEach((td, i) => {
          if (titulos[i] && !td.hasAttribute("data-et")) td.setAttribute("data-et", titulos[i]);
        });
      });
    });
  });
  void ruta;
  return null;
}
