# Iconos

Iconos animados de **Hugeicons** vía [Animate UI](https://animate-ui.com/docs/icons/hugeicons)
(set gratuito, stroke rounded, grosor 2). Cada icono es un archivo propio en el proyecto: solo se
instala lo que se usa.

## Configuración (ya hecha)

`components.json` tiene el registro:

```json
"registries": { "@animate-ui": "https://animate-ui.com/r/{name}.json" }
```

Por eso el MCP de shadcn y el CLI encuentran los iconos.

## Agregar un icono

```bash
pnpm dlx shadcn@latest add @animate-ui/icons-hugeicons-send-horizontal
```

- Nombre del registro: `icons-hugeicons-<nombre>` (ver tabla de mapeo).
- Queda en `src/shared/components/animate-ui/icons/hugeicons/<nombre>.tsx`.
- El primer icono instala `@animate-ui/react` y `motion`.

## Usar

```tsx
import { SendHorizontal } from '@/shared/components/animate-ui/icons/hugeicons/send-horizontal'

;<SendHorizontal size={20} animateOnHover />
```

Cada icono exporta el componente en PascalCase y un alias con sufijo `Icon` (`SendHorizontalIcon`).

### Props

| Prop                                                           | Tipo                                           | Para qué                         |
| -------------------------------------------------------------- | ---------------------------------------------- | -------------------------------- |
| `size`                                                         | `number`                                       | Tamaño en px                     |
| `animate`                                                      | `boolean \| animación`                         | Anima ya (controlado)            |
| `animateOnHover` / `animateOnTap` / `animateOnView`            | `boolean \| animación`                         | Disparadores                     |
| `animateOnViewOnce`, `animateOnViewMargin`                     | `boolean`, margen                              | Ajustes de `animateOnView`       |
| `animation`                                                    | `'default' \| 'path' \| 'path-loop' \| propia` | Qué animación correr             |
| `loop`, `loopDelay`                                            | `boolean`, `number` (ms)                       | Repetir                          |
| `delay`, `speed`                                               | `number`                                       | Retraso y velocidad              |
| `persistOnAnimateEnd`, `initialOnAnimateEnd`, `completeOnStop` | `boolean`                                      | Qué pasa al terminar o detenerse |

Además acepta las props de un `<svg>` (`className`, `aria-*`…). El color sale de `currentColor`:
usar clases de token (`text-primary`, `text-success`…), nunca hex.

### Animar el icono al pasar sobre el botón (no solo sobre el icono)

```tsx
import { AnimateIcon } from '@animate-ui/react/icons'

;<AnimateIcon animateOnHover asChild>
  <Button>
    <Headphones /> Hablar con un asesor
  </Button>
</AnimateIcon>
```

El icono hereda el disparador del `AnimateIcon` que lo envuelve.

### Accesibilidad

- Icono decorativo junto a texto: `aria-hidden`.
- Botón solo con icono: `aria-label` en el botón.
- Respetar `prefers-reduced-motion`: no usar `loop` en iconos que siempre están en pantalla.

## Mapeo por pantalla

Nombres verificados en el registro (381 iconos Hugeicons disponibles).

### Chat (`/`, feature `chat`)

| Uso                              | Icono                                                        | Componente                                    |
| -------------------------------- | ------------------------------------------------------------ | --------------------------------------------- |
| Enviar mensaje                   | `send-horizontal`                                            | Composer                                      |
| Hablar con un asesor             | `headphones`                                                 | ChatHeader                                    |
| Avatar del asistente IA          | `bot-message-square`                                         | burbuja IA                                    |
| Escribiendo…                     | `message-circle-more`                                        | TypingIndicator (`loop`)                      |
| Cargando datos del TMS…          | `loading-01`                                                 | estado del sistema                            |
| Reintentar                       | `refresh`                                                    | error de envío                                |
| Sin conexión                     | `wifi-off-01`                                                | StatusBanners                                 |
| Esperando asesor                 | `timer`                                                      | StatusBanners                                 |
| Sugerencias / respuestas rápidas | `sparkles`                                                   | quick_replies                                 |
| Sugerencias de bienvenida        | `Truck`, `Calculator`, `BookOpen` (lucide), `triangle-alert` | ChatView (rastrear, cotizar, norma, problema) |
| Adjuntar (P1)                    | `attachment-01`                                              | Composer                                      |

### Rastreo (feature `tracking`)

| Uso                      | Icono                 |
| ------------------------ | --------------------- |
| Origen → destino         | `route`               |
| Ubicación de referencia  | `location-01`         |
| Entrega estimada (ETA)   | `calendar-clock`      |
| Entregado                | `checkmark-circle-02` |
| Novedad / retenido       | `triangle-alert`      |
| Cadena de frío           | `snowflake`           |
| Temperatura registrada   | `temperature`         |
| Comprobante de entrega   | `file-check`          |
| Línea de tiempo (evento) | `clock-01`            |

### Cotización (feature `quote`)

| Uso                | Icono            |
| ------------------ | ---------------- |
| Total / desglose   | `wallet`         |
| Seguro             | `shield-check`   |
| Falta tarifa (F22) | `triangle-alert` |
| Valor declarado    | `tag`            |

### Citas (feature `citations`)

| Uso                | Icono                  |
| ------------------ | ---------------------- |
| Fuente / cita      | `message-square-quote` |
| Documento enlazado | `link-01`              |

### PQRS (feature `pqrs`)

| Uso                 | Icono             |
| ------------------- | ----------------- |
| Documento recibido  | `clipboard-check` |
| Documento faltante  | `file-x`          |
| Validación de plazo | `file-clock`      |
| Subir archivo (P1)  | `upload-01`       |

### Escalamiento (feature `handoff`)

| Uso                    | Icono           |
| ---------------------- | --------------- |
| Alerta de escalamiento | `octagon-alert` |
| Prioridad              | `flag`          |
| Departamento           | `users`         |

### Alertas proactivas (feature `proactive-alerts`)

| Uso          | Icono             |
| ------------ | ----------------- |
| Nueva alerta | `bell-ring`       |
| Notificación | `notification-01` |

### Simulador (`/simulador`, feature `channel-simulator`)

| Uso                           | Icono                                                        |
| ----------------------------- | ------------------------------------------------------------ |
| Web Chat                      | `globe-02`                                                   |
| WhatsApp (simulado)           | `message-circle`                                             |
| PBX (simulado)                | `phone-call`                                                 |
| Colgar, voz, papelera, buscar | `PhoneOff`, `Volume2`/`VolumeX`, `Trash2`, `Search` (lucide) |
| Entrada por voz               | `mic`                                                        |

No se usan logotipos de marcas reales (regla del proyecto), por eso WhatsApp va con `message-circle`.

### Asesor y métricas (`/interno/asesor`, `/interno/metricas`)

| Uso                             | Icono                       |
| ------------------------------- | --------------------------- |
| Bandeja de casos                | `users-round`               |
| Sentimiento negativo / positivo | `thumbs-down` / `thumbs-up` |
| Métricas                        | `chart-column-increasing`   |
| Navegación: métricas            | `layout-dashboard`          |

### Barra lateral (`app/user-layout.tsx`)

| Uso                  | Icono                                                         |
| -------------------- | ------------------------------------------------------------- |
| Chat con Logi        | `bot-message-square`                                          |
| Consultas            | `Package` (lucide)                                            |
| WhatsApp y llamada   | `message-circle`                                              |
| Paso hecho / novedad | `checkmark-circle-02` / `triangle-alert` (tarjeta de rastreo) |
| Administrador        | `layout-dashboard`                                            |
| Reloj de la cabecera | `clock-01` (`shared/ui/live-clock.tsx`)                       |

### Administrador (`/admin`, feature `business-insights`)

| Uso                 | Icono                |
| ------------------- | -------------------- |
| Rutas cotizadas     | `route`              |
| Qué resuelve Logi   | `bot-message-square` |
| Pasos a asesor      | `triangle-alert`     |
| Estado de las guías | `Truck` (lucide)     |

### Tarjetas del chat (`shared/ui/block-card.tsx`)

| Tarjeta           | Icono                                  |
| ----------------- | -------------------------------------- |
| Rastreo           | `Truck` (lucide), `MapPin` (lucide)    |
| Cotización        | `Calculator` (lucide)                  |
| Fuentes           | `BookOpen` (lucide)                    |
| Documentos / caso | `clipboard-check`, `FileText` (lucide) |
| Asesor            | `Headphones` (lucide, provisional)     |

## Sin versión animada

El set de Hugeicons de Animate UI **no tiene** camión, paquete, calculadora, báscula ni libro.
Para esos se usa `lucide-react` (ya instalado, estático):

| Uso                      | Icono lucide |
| ------------------------ | ------------ |
| En tránsito / en reparto | `Truck`      |
| Envío / guía             | `Package`    |
| Cotizar envío            | `Calculator` |
| Peso real / volumétrico  | `Scale`      |
| Normativa                | `BookOpen`   |

Antes de agregar un icono nuevo, buscarlo en el registro (MCP de shadcn o
`pnpm dlx shadcn@latest search @animate-ui -q <texto>`) y añadirlo a esta tabla.
