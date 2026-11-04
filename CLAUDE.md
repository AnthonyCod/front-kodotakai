# front-kodotakai — TransLogix AI (frontend)

Proyecto independiente (KODO TAKAI 2026). Chat PWA cuyas respuestas son bloques tipados.
Detalle de stack, scripts y estructura: `README.md`.

## Reglas de trabajo

- Hacer solo lo pedido. Nada de pantallas, diseño o componentes extra sin que se pidan.
- Mobile-first y responsive siempre.
- No inventar contratos con el backend: lo provisional va marcado `(por confirmar)`.
- Contrato: `docs/api/openapi.json` → `pnpm api:types`. Saliente con `ApiSchemas`; entrante con Zod
  en su feature (`src/test/contract.test.ts` lo prueba contra capturas reales).
- Textos del backend siempre como texto plano (nunca `dangerouslySetInnerHTML`). `client_id` nunca en
  URLs ni logs. `confidence_score` no se muestra como porcentaje.

## Arquitectura (la valida `pnpm lint`)

- `app/` compone (providers, router, `block-registry.ts`). `pages/` solo combina features.
- `features/<x>/{api,model,components}` + `index.ts` como única API pública.
- `shared/` no importa features. Nadie importa `mocks/`.
- Red: solo `shared/api/http-client.ts`, siempre con schema Zod.
- Bloque nuevo: `defineBlock` en su feature → exportar en su `index.ts` → registrar en `app/block-registry.ts`.
- Bloques interactivos: `useBlockActions()` de `@/shared/blocks`, nunca importar `chat`.
- Las páginas tienen `<Zone>` de plantilla: se reemplazan por el componente real y, al final, se borra `shared/ui/zone.tsx`.

## Componentes UI

- shadcn vía MCP (`.mcp.json`, servidor `shadcn`): buscar y agregar con el MCP, no copiar código a mano.
  Quedan en `src/shared/ui/`; importan `cn` del paquete `cn`.
- Colores solo con tokens de `src/index.css`: `brand`, `brand-deep`, `brand-foreground` (Logi), `primary`, `success`, `warning`, `destructive`,
  `user-bubble`, `muted-foreground`, `shadow-card`. Nada de hex sueltos.
- Iconos: Hugeicons animados de Animate UI (registro `@animate-ui` en `components.json`). Antes de usar uno,
  mirar el mapeo en `docs/iconos.md`; si se agrega uno nuevo, actualizar esa tabla. Sin versión animada →
  `lucide-react`.
- Fondo animado: `<InteractiveGradient />` de `@/shared/ui/interactive-gradient` (WebGL2 propio, sin three.js).
  Ocupa su contenedor (padre `relative` con tamaño). Colores en tokens `--gradient-1..4`. Usarlo en zonas
  de vitrina: el panel del chat (diseño de Logi, texto blanco con sombra y bloques como tarjetas blancas),
  simulador o detrás de `LiquidGlassButton`.
- Vidrio: `<Button variant="glass">` (CSS, por defecto). `LiquidGlassButton` (WebGL, pesado) solo en
  1-2 botones de vitrina y con un `background` que refractar.

## Verificar

`pnpm typecheck && pnpm lint && pnpm test && pnpm build`
