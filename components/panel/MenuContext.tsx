"use client";

import { createContext, useContext } from "react";

/** Lo que el cascarón comparte con las barras de cada pantalla. */
export type Menu = { abrir: () => void; avisos: number };
export const MenuCtx = createContext<Menu>({ abrir: () => undefined, avisos: 0 });
export const useMenu = () => useContext(MenuCtx);
