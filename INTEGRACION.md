# Neife CRM para abogados · guía de integración

Módulo que agrega a **Neife** un CRM completo de seguimiento de clientes con indicadores y metas semanales, mensuales y diarias, en el mismo estilo de trabajo de la app de referencia (indicadores clave, metas editables, clientes con avance, gestiones abiertas, grupos, plan semanal, botón «+» de acciones rápidas), pero con el vocabulario y el embudo de un abogado.

Se probó contra tu proyecto real (Next.js 16, Postgres, `pg`, sesiones propias): tipos sin errores, **34 pruebas automáticas pasan** (las 20 que ya tenías más 14 nuevas), `next build` compila y las 12 pantallas se recorrieron en un navegador con datos de ejemplo.

---

## 1. Qué trae

| Pantalla | Ruta | Qué hace |
|---|---|---|
| Inicio | `/panel/crm` | Indicadores semanales y mensuales, «Meta de hoy», clientes con avance, gestiones abiertas, ayudas, filtros rápidos y grupos |
| Indicadores | `/panel/crm/metas` | Todos los indicadores por día, semana o mes, con navegación por período |
| Editar meta | `/panel/crm/metas/[indicador]` | Meta con − / +, «Real: n» desplegable, «Potencial» (a quién mover), planes para encontrar clientes y gráfico de evolución |
| Clientes | `/panel/crm/clientes` | Lista agrupada por cercanía a concretarse, búsqueda, etapas, grupos y filtros rápidos |
| Ficha del cliente | `/panel/crm/clientes/[id]` | Etapa, contacto (llamar, WhatsApp, correo), hito, próximo contacto, historial, tareas, grupos, edición y borrado |
| Agenda | `/panel/crm/agenda` | Hitos, contactos, tareas y planes de la semana, más lo atrasado |
| Planificación semanal | `/panel/crm/planificacion` | Plan por día: dónde y a quién buscar clientes (5 fuentes) |
| Tareas / Notas | `/panel/crm/tareas`, `/notas` | Lista de tareas y notas rápidas |
| Zonas | `/panel/crm/zonas` | Clientes por región y comuna |
| Informes | `/panel/crm/informes` | Metas de 6 meses, embudo de 90 días, clientes por etapa y gráficos |
| Plantillas | `/panel/crm/plantillas` | Mensajes para copiar, guía de primera asesoría y reglas que cuidar |

Botón **«+»** flotante en todo el CRM: Cliente, Asesoría, Reunión o audiencia, Contacto y Tarea, con un formulario corto.

### Equivalencias con la app de referencia

| Referencia | CRM legal |
|---|---|
| Personas | Clientes |
| Neue Personen (nuevos que reciben lecciones) | Clientes nuevos |
| Lektionen mit beteiligtem Mitglied | Asesorías con abogado o colega presente |
| Mit Taufdatum | Casos con fecha de hito (audiencia, mediación, firma, plazo) |
| Potenzielles Mitglied – Versammlung | Clientes que asisten a reunión o audiencia |
| Getauft und konfirmiert + meta mensual | Mandatos firmados + meta del mes |
| Pläne zum Finden | Planificación semanal (5 fuentes) |
| Gruppen / Aufgaben / Kurznotizen | Grupos / Tareas / Notas rápidas |

### Indicadores incluidos (8)

Clientes nuevos · Asesorías realizadas · Asesorías con colega · Casos con fecha de hito · Clientes en reunión o audiencia · Mandatos firmados · Clientes conectados con un abogado · Casos resueltos. Cada uno puede tener meta **diaria, semanal o mensual** (según corresponda). Para agregar o renombrar indicadores ver el punto 7.

---

## 2. Qué hay en el ZIP

Todo está en las mismas rutas de tu proyecto: se descomprime **encima** de la carpeta raíz de Neife. Solo se agregan archivos nuevos; el instalador agrega una migración Prisma y modifica el menú lateral y `package.json` (con copias de respaldo).

```
db/crm.sql                              tablas del CRM
lib/crm/catalogo.ts                     indicadores, etapas, orígenes (lo que más vas a editar)
lib/crm/fechas.ts                       semana lunes-domingo, hora de Chile
lib/crm/servicio.ts                     toda la lógica y las consultas
lib/crm/validadores.ts                  validación de formularios (zod)
lib/crm/vista.ts                        ayudas para las páginas
lib/acciones/crm.ts                     acciones de servidor (formularios)
components/crm/*                        piezas visuales
app/crm.css                             estilos (usa los colores de globals.css)
app/(panel)/panel/crm/**                las 12 pantallas
scripts/instalar-crm.ts                 conecta el módulo (3 cambios, repetible)
scripts/demo-crm.ts                     14 clientes ficticios para probar
tests/crm.test.ts                       14 pruebas automáticas
docs/capturas-crm/                      capturas de las pantallas
```

---

## 3. Instalación (10 minutos)

Haz una rama o copia antes: `git checkout -b crm`.

```bash
# 1. Descomprime el ZIP en la raíz de Neife (donde está package.json)
unzip neife-crm.zip -d .

# 2. Mira qué va a cambiar, y luego aplícalo
npx tsx scripts/instalar-crm.ts --dry-run
npx tsx scripts/instalar-crm.ts

# 3. Revisa que todo compile y arranca
npm run db:migrate
npm run typecheck
npm run dev

# 4. (solo para probar) datos de ejemplo, usando al asesor de «npm run demo»
npm run demo        # si aún no lo corriste
npm run demo:crm
```

Entra como `asesor@neife.test` / `AsesorDemo-2026` → menú lateral **CRM**. Las tablas se crean mediante la migración Prisma, que también se ejecuta durante `npm run build`.

### Qué modifica el instalador (por si prefieres hacerlo a mano)

1. **`prisma/migrations/20261031000000_crm/migration.sql`**: copia el contenido de `db/crm.sql`; Prisma aplica y registra esta migración.
2. **`app/(panel)/panel/layout.tsx`**: agrega bajo «Casos» la línea
  `{ href: "/panel/crm", texto: "CRM", icono: "usuarios" },`
3. **`package.json`**: agrega el script `"demo:crm": "tsx scripts/demo-crm.ts"`.

Los archivos existentes modificados quedan con una copia `*.bak-crm` al lado. Para deshacer: restaura las copias y borra la migración y las carpetas nuevas. Las tablas `crm_*` pueden quedarse en la base sin molestar.

No hace falta nueva dependencia, nueva variable de entorno ni nuevo servicio: usa `pg`, `zod`, `jose` y el cifrado que ya tienes.

---

## 4. Cómo se conecta con lo que ya tienes

- **Sesión y permisos**: cada pantalla y cada acción llama a `requerirAbogado()` (tu `lib/guards.ts`). Solo abogados con cuenta verificada entran. El administrador no ve el CRM.
- **Aislamiento**: toda consulta filtra por `abogado_id`; un abogado jamás ve ni toca los clientes de otro (hay una prueba que lo verifica).
- **Cifrado**: nombre, teléfono, correo, notas, historial y tareas se guardan cifrados con tu `lib/crypto.ts` (AES-256-GCM, atado a la columna con contextos `crm.*`). Sin cambios en `DATA_ENCRYPTION_KEY`. Lo que **no** va cifrado: materia, región, comuna, etapa y fechas, porque se necesitan para filtrar y calcular; no identifican a la persona por sí solos.
- **Auditoría**: crear, eliminar, cambiar de etapa e importar quedan en tu tabla `auditoria`.
- **Base de datos**: usa tu capa `getDb()` (`execute` / `batch`, con `?` y transacciones). Las fechas siguen tu convención de texto; los días se guardan como `YYYY-MM-DD` en hora de Chile.
- **Estilo**: `app/crm.css` solo usa tus variables (`--pizarra`, `--cafe`, `--crema`, `--azul`…) y tus clases (`.p-cab`, `.btn`, `.entrada`). Si cambias la paleta en `globals.css`, el CRM la sigue.

### Cómo se calculan los indicadores

Cada cosa medible escribe una fila en `crm_eventos` (un «libro de eventos») **en la misma transacción** que el cambio. Los indicadores se **cuentan** desde ahí; nunca hay contadores guardados que puedan desfasarse. Por eso:

- Borrar una asesoría corrige el indicador solo (los eventos se borran en cascada).
- Hitos del embudo (fecha de hito, mandato, derivación, caso resuelto) se cuentan **una sola vez por cliente**, aunque cambies la etapa de ida y vuelta.
- «Clientes distintos» vs «cada vez» lo define el catálogo (`modo: "personas" | "eventos"`).
- Las metas se guardan por período y **rigen hacia adelante** hasta que las cambies: fijar «8» en una semana la deja en 8 las semanas siguientes. Si nunca fijaste una, se usa el valor base del catálogo.

### Tablas nuevas

`crm_personas`, `crm_interacciones`, `crm_eventos`, `crm_metas`, `crm_tareas`, `crm_grupos`, `crm_grupo_personas`, `crm_planes`. Todas con `ON DELETE CASCADE` desde `usuarios` y RLS activado.

---

## 5. Traer tus casos actuales y conectar los nuevos

- **Casos que ya existen**: en `/panel/crm/clientes` aparece el aviso «Importar mis casos» cuando hay solicitudes que aún no están en el CRM. Descifra y vuelve a cifrar con el contexto del CRM, conserva la antigüedad, mapea las etapas (nueva→Prospecto, en curso→En asesoría, derivada→Derivado, cerrada→Resuelto, rechazada→No continuó) y no duplica si lo repites. Omite casos anonimizados.
- **Casos nuevos (opcional)**: para que cada solicitud nueva aparezca sola en el CRM, llama a la importación al final de la acción que la crea:

```ts
// lib/acciones/solicitudes.ts, después de crear la solicitud y antes del redirect
import { importarSolicitudes } from "../crm/servicio";
await importarSolicitudes(asesorId); // trae solo las que faltan
```

  Hazlo dentro de `after(() => …)` si no quieres demorar la respuesta. Lo mismo para `contactoRapido` en `lib/acciones/panel.ts`. No lo dejé automático para no modificar tus flujos de solicitudes sin que lo decidas.

---

## 6. Publicar (Vercel + Supabase)

Despliega la migración Prisma junto con el cambio. `npm run build` ejecuta `prisma migrate deploy` antes de compilar. Confirma en Supabase que las 8 tablas `crm_*` aparecen con RLS activado. **No corras `npm run demo:crm` en producción** (el script se niega si `NODE_ENV=production`).

---

## 7. Personalizar

Todo en `lib/crm/catalogo.ts`:

- **Agregar un indicador**: suma un objeto a `METRICAS` (clave, nombre, ayuda, icono, `modo`, períodos, metas base) y amplía el tipo `MetricaClave`. Para que se mueva, haz que alguna acción escriba un evento con esa clave (en `servicio.ts`, ver `registrarInteraccion` o `EVENTO_POR_ETAPA`). Para el «Potencial», agrega su regla en `potencial()`.
- **Qué se ve en el Inicio**: `HOME_SEMANAL` y `HOME_MENSUAL`.
- **Etapas, hitos, canales, orígenes, grupos base**: `ETAPAS_CRM`, `TIPOS_HITO`, `CANALES`, `ORIGENES_CRM`, `GRUPOS_BASE`. Si agregas una etapa, también hay que sumarla al `CHECK` de `crm_personas.etapa` en `db/crm.sql` (y a una migración si la base ya existe).
- **Metas base** (lo que ve alguien que aún no fija las suyas): campo `base` de cada indicador.
- **Textos de plantillas y reglas**: `app/(panel)/panel/crm/plantillas/page.tsx`.

---

## 8. Cosas a decidir y revisar antes de usarlo con clientes reales

- **Un abogado debe revisar los textos y el flujo.** Los datos de ejemplo, las plantillas y los «consejos» son un punto de partida, no asesoría.
- **Captación y publicidad**: el CRM sirve para dar seguimiento a quienes ya te contactaron o te fueron recomendados. Contactar a personas en frío puede chocar con las reglas de publicidad y captación de clientela del Código de Ética del Colegio de Abogados. Confírmalo con un abogado; la página de plantillas ya lo advierte.
- **Datos personales**: estás guardando datos de clientes. Revisa con un abogado qué exige la Ley 19.628 y la nueva ley de protección de datos personales (verifica su fecha de entrada en vigencia), y actualiza `/privacidad` para mencionar el CRM. Hoy tu política de borrado (`npm run limpiar`) **no incluye** las tablas `crm_*`: define cuánto tiempo conservarás clientes inactivos y agrega ese borrado (candidatos: etapas «No continuó» y «Resuelto» con más de N meses).
- **Respaldos**: igual que antes, guarda `DATA_ENCRYPTION_KEY` aparte; sin ella los datos cifrados del CRM tampoco se recuperan.
- **Mapa**: la referencia tiene un mapa de territorio. Aquí «Zonas» agrupa por región y comuna; un mapa real necesitaría teselas externas y relajar el `Content-Security-Policy` (`img-src`), así que lo dejé fuera a propósito.

## 9. Límites conocidos y siguientes pasos naturales

- El selector de clientes del botón «+» carga hasta 500 clientes; para carteras muy grandes conviene cambiarlo por búsqueda.
- Reordenar grupos se hace con flechas ↑↓ (más fiable en el celular que arrastrar).
- No hay exportación a CSV ni resumen semanal por correo; el segundo encaja con tu cron `/api/cron/recordatorios` usando `contarPeriodos` y `metasVigentes`.
- Sin modo oscuro (el panel de Neife es claro). Si lo quieres, bastan variables en `app/crm.css`.
- La búsqueda de clientes se hace en el servidor ya descifrada (los nombres están cifrados), por eso no usa índice.

## 10. Pruebas

```bash
TEST_DATABASE_URL=postgres://usuario:clave@localhost:5432/neife npm test
```

Las 14 pruebas del CRM cubren: semana lunes–domingo y hora de Chile, cifrado de datos, aislamiento entre abogados, conteos (asesorías vs clientes distintos), hitos contados una vez, corrección al borrar, metas con valor base y arrastre, tareas/grupos/planes, importación sin duplicados y RLS activado. Usan un esquema temporal que se borra al terminar.
