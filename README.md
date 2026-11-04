# TransLogix AI — Frontend

PWA de atención al cliente de TransLogix (KODO TAKAI 2026). Un chat cuyas respuestas son
**bloques** (texto, rastreo, cotización, citas, escalamiento…) que el frontend dibuja según su tipo.

## Requisitos

- Node.js 20.19+ o 22.12+
- pnpm 10 (`npm i -g pnpm`)

## Correr en local

```bash
pnpm install
cp .env.example .env.development   # si no existe
pnpm dev
```

Abre http://localhost:5173.

### Variables de entorno

| Variable            | Valor por defecto       | Para qué                                                            |
| ------------------- | ----------------------- | ------------------------------------------------------------------- |
| `VITE_API_URL`      | `/api/v1`               | URL base del API (en producción, la URL pública completa)           |
| `VITE_API_MOCKING`  | `true` en dev           | `true` simula el backend con MSW (`src/mocks`); `false` usa el real |
| `BACKEND_URL`       | `http://localhost:8000` | Solo dev: a dónde reenvía el proxy de Vite `/api` (no va al bundle) |
| `VITE_HERE_API_KEY` | (vacío)                 | Mapa de `/sucursales` (HERE Maps JS). Sin ella, imagen fija         |

## Scripts

| Comando          | Qué hace                                |
| ---------------- | --------------------------------------- |
| `pnpm dev`       | Servidor de desarrollo                  |
| `pnpm build`     | Typecheck + build de producción (PWA)   |
| `pnpm preview`   | Sirve el build de producción            |
| `pnpm typecheck` | Solo TypeScript                         |
| `pnpm lint`      | oxlint (incluye reglas de arquitectura) |
| `pnpm test`      | Tests con Vitest                        |
| `pnpm format`    | Prettier                                |
| `pnpm api:types` | Regenera `src/shared/api/openapi.d.ts`  |

## Stack

Vite · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Zustand · TanStack Query · Zod · MSW ·
vite-plugin-pwa · Vitest · oxlint

## Estructura

```
src/
├── app/       composición: providers, router, registro de bloques
├── pages/     páginas: solo combinan features
├── features/  un módulo por flujo (chat, tracking, quote, citations, pqrs, handoff,
│              channel-simulator, proactive-alerts, agent-inbox, metrics)
│              └─ cada una: api/ · model/ · components/ · index.ts (API pública)
├── shared/    api (cliente HTTP único) · blocks (orquestador) · config · ui (shadcn) · lib
├── mocks/     simulación del backend con MSW
└── test/      setup de Vitest
```

### Reglas (las valida `pnpm lint`)

- `shared` no importa features, pages ni app.
- Una feature importa otra **solo** desde su `index.ts`: `@/features/tracking`, nunca `@/features/tracking/model/...`.
- Nadie importa `mocks`: MSW intercepta la red.
- Toda llamada al backend pasa por `shared/api/http-client.ts` y se valida con Zod.

## Agregar un tipo de bloque

1. En su feature, define el schema y el componente, y exporta el bloque desde `index.ts`:

   ```ts
   export const trackingCardBlock = defineBlock({
     type: 'TRACKING_CARD',
     schema: trackingCardBlockSchema,
     Component: TrackingCard,
   })
   ```

2. Regístralo en `src/app/block-registry.ts`.

No se toca nada más. Los campos que no estén en el schema se descartan antes de renderizar.

Si el bloque es interactivo, usa `useBlockActions()` de `@/shared/blocks` para enviar texto (y
adjuntos ya subidos) al chat. El backend no recibe datos estructurados por el chat.

## Componentes de UI

Se agregan con shadcn y quedan en `src/shared/ui/`:

```bash
pnpm dlx shadcn@latest add card
```

Los colores salen de los tokens de `src/index.css` (`primary`, `success`, `warning`,
`destructive`, `user-bubble`…). Usa esas clases (`bg-primary`, `text-success`) en lugar de colores
fijos.

## Iconos

Hugeicons animados de [Animate UI](https://animate-ui.com/docs/icons/hugeicons). Instalación, props y
qué icono va en cada pantalla: [`docs/iconos.md`](docs/iconos.md).

```bash
pnpm dlx shadcn@latest add @animate-ui/icons-hugeicons-send-horizontal
```

## Efectos visuales

| Componente                 | Ruta                               | Peso             | Uso                                    |
| -------------------------- | ---------------------------------- | ---------------- | -------------------------------------- |
| `<Button variant="glass">` | `@/shared/ui/button`               | CSS              | Botones de vidrio (por defecto)        |
| `<LiquidGlassButton>`      | `@/shared/ui/liquid-glass-button`  | WebGL, diferido  | 1-2 botones de vitrina                 |
| `<InteractiveGradient>`    | `@/shared/ui/interactive-gradient` | WebGL2, sin deps | Fondo animado que sigue puntero o dedo |

```tsx
<section className="relative h-80">
  <InteractiveGradient options={{ resolutionScale: 0.5 }} />
  <div className="relative">Contenido encima</div>
</section>
```

- `InteractiveGradient` se pausa fuera de pantalla o con la pestaña oculta, dibuja un cuadro fijo con
  `prefers-reduced-motion` y, sin WebGL2, muestra un degradado CSS con los mismos colores.
- Opciones: `brushSize`, `brushStrength`, `distortionAmount`, `fluidDecay`, `trailLength`, `stopDecay`,
  `colorIntensity`, `softness`, `resolutionScale` (bajar a `0.5` si en móvil va lento) y `colors`.
- Colores por defecto: tokens `--gradient-1..4` en `src/index.css`.
- Shaders basados en _WebGL Interactive Gradient_ de Codegrid (Experiment 0469), portados a WebGL2.

## Carga masiva (envíos B2B, contrato 1.3.0)

- `/carga-masiva`: plantilla Excel → validación fila por fila en el navegador → `POST /shipment-batches`
  con `Authorization: Bearer <API key>` e `Idempotency-Key` = `referencia_lote` → resultado por envío
  (`GET /shipment-batches/{id}/items`, todas las páginas): guía si se creó, motivo si se rechazó.
- La API key la escribe el cliente empresarial; solo vive en memoria (no se guarda ni se registra).
- `docs/api/openapi.json` sigue en 1.2.0: los nombres de la respuesta que la guía del backend no detalla
  (`batch_id`, `numero_guia`, `referencia_cliente` del ítem) están marcados (por confirmar) en
  `features/bulk-upload/api/batches-api.ts`. Con el 1.3.0: `pnpm api:types` y pasar a `ApiSchemas`.
- MSW simula el lote (`src/mocks/shipment-batches.ts`): idempotencia, 409, rechazos por ítem y cursor.

## Sucursales (mapa HERE)

- `/sucursales`: mapa de HERE a pantalla completa, un pin por sucursal y una tarjeta que se despliega o
  minimiza; ◀ ▶ recorren la lista en círculo y el mapa se mueve solo a la sucursal activa.
- HERE se carga desde su CDN solo en esa pantalla (`shared/lib/here-maps.ts`), no entra al bundle.
- La key queda visible en el navegador: en el portal de HERE, restríngela en **Trusted domains**
  (`localhost:5173` y el dominio de producción).
- Las sucursales (Sincelejo) y sus fotos son de prueba: `features/branches/model/branches.ts` (por confirmar).

## Voz

Solo en el front, con la Web Speech API del navegador. El backend no recibe ni envía audio:

- Dictar (voz → texto): `useSpeechRecognition` de `@/shared/hooks/use-speech-recognition`. Chrome y
  Edge; Safari parcial; Firefox no. Necesita internet y permiso de micrófono (localhost o HTTPS).
- Leer en voz alta (texto → voz): `speak` de `@/shared/lib/speech-synthesis`. Todos los navegadores.
- Chat: botón de micrófono (dicta en la caja) y "Voz" (Logi lee sus respuestas; con Voz activa, lo
  dictado se envía solo).
- Simulador, llamada: cada frase dicha es un turno del PBX y Logi responde en voz alta con `speech_text`.

## Backend

Contrato: `docs/api/openapi.json` (API pública del MVP 1.2.0). Si cambia, se reemplaza ese archivo y
se corre `pnpm api:types`.

- Lo saliente se tipa con lo generado (`ApiSchemas` de `@/shared/api`); lo entrante se valida con Zod en
  cada feature. `src/test/contract.test.ts` comprueba los schemas contra respuestas reales.
- Conectar al backend real: `VITE_API_MOCKING=false` y `BACKEND_URL` con su URL. El puerto 5173 es fijo
  porque es el origen que el backend permite por CORS.
- Mocks: `src/mocks/fixtures/chat.json` son capturas reales; el texto del mensaje elige cuál devolver
  (`src/mocks/scenarios/chat-scenarios.ts`).

Pendiente en backend: canal asesor → cliente y WebSocket (las respuestas del asesor no llegan solas),
login de asesores (un solo `X-Admin-Token`, que no puede ir en el bundle), `interactive_reply_id` para
botones en web. Lo marcado `(por confirmar)` en el código depende de eso.
