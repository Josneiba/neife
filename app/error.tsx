"use client";
import { PantallaError } from "@/components/PantallaError";
export default function Error(p: { error: Error & { digest?: string }; reset: () => void }) {
  return <PantallaError error={p.error} reintentar={p.reset} />;
}
