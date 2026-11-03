const produccion = process.env.NODE_ENV === "production";

// Cabeceras de seguridad. La política de contenido (CSP) solo se aplica en producción
// porque el modo desarrollo de Next necesita scripts que ella bloquearía.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://tile.openstreetmap.org https://*.tile.opentopomap.org https://tile.opentopomap.org",
  "font-src 'self'",
  "connect-src 'self' https://nominatim.openstreetmap.org",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const cabeceras = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  ...(produccion
    ? [
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        { key: "Content-Security-Policy", value: csp },
      ]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["pdfkit", "pg", "snowball-stemmers"],
  outputFileTracingIncludes: { "/**/*": ["db/**/*", "biblioteca/**/*", "public/logo-neife-chico.png"] },
  experimental: {
    // Documentos PDF que el abogado sube a una ficha (máx. 4 MB)
    serverActions: { bodySizeLimit: "5mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: cabeceras }];
  },
};

export default nextConfig;
