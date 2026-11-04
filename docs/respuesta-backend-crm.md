# Respuesta del front a CR-007 (módulo Asesor)

Responde a `RESPUESTA_FRONT_CRM.md` y a las decisiones D-CRM1–9 de `REVISION_SOLICITUD_ASESOR.md`
(backend en `6cc4f4c`, contrato 1.5.0). Front: rama `kenith-crm` de `front-kodotakai`.

## Decisiones

| #   | Decisión                                 | Respuesta                                                                                                                           |
| --- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **D-CRM2: etapas del tablero de ventas** | Las 5 columnas del diseño + post-venta como etiqueta (abajo)                                                                        |
| 2   | D-CRM4: destinatario al cerrar           | Lo captura el asesor en un **formulario de cierre**. Ya está hecho en el front                                                      |
| 3   | D-CRM5: pedir asesor después de cotizar  | **Lead de ventas**. El lenguaje legal o muy negativo sigue siendo caso                                                              |
| 4–9 | D-CRM3, 6, 7, 8, 9 y 1                   | **Aceptamos sus propuestas** (`provisional-v1`, prioridades de §10.2, cliente sin teléfono, sin "Recolección", `CANCELADO`, correo) |

### Etapas del tablero de ventas (D-CRM2)

| Columna en la UI            | `stage`            | Spec 1.1             | Hacia                                          |
| --------------------------- | ------------------ | -------------------- | ---------------------------------------------- |
| Nuevas Cotizaciones (Bot)   | `NUEVA_COTIZACION` | `PENDIENTE_ASESOR`   | `EN_CONTACTO`, `DESCARTADO`✱                   |
| En Contacto / Llamada       | `EN_CONTACTO`      | `EN_SEGUIMIENTO`     | `NEGOCIACION`, `VENTA_CERRADA`†, `DESCARTADO`✱ |
| Negociación B2B/B2C         | `NEGOCIACION`      | `DATOS_PENDIENTES`   | `EN_CONTACTO`, `VENTA_CERRADA`†, `DESCARTADO`✱ |
| Venta Cerrada (Guía Creada) | `VENTA_CERRADA`    | `LISTO_PARA_AGENCIA` | — (el asesor ya no lo mueve)                   |
| Descartada                  | `DESCARTADO`       | `CANCELADO`          | — (terminal)                                   |

✱ con `motivo` (422 `JUSTIFICACION_REQUERIDA`). † solo por el endpoint de cierre, que emite la guía.

- `NEGOCIACION` reemplaza a `DATOS_PENDIENTES` en el tablero: el asesor negocia condiciones y reúne
  los datos del cierre. Para la spec 1.1 equivale a `DATOS_PENDIENTES`.
- **Post-venta sin columnas:** `ENTREGADO_A_AGENCIA` y `CERRADO` no son columnas. El lead sigue en la
  columna `VENTA_CERRADA` y la tarjeta muestra la guía y una etiqueta. Proponemos un campo aparte en la
  tarjeta y el detalle: `postventa: null | "ENTREGADO_A_AGENCIA" | "CERRADO"`. Si prefieren dejarlo en
  `stage`, el tablero debe agrupar esos dos valores bajo la columna `VENTA_CERRADA`.
- Pedimos que cada etapa del tablero traiga sus destinos permitidos (`etapas[].hacia: string[]`) para
  que la UI solo ofrezca transiciones válidas.

### Cierre de venta (D-CRM4)

El front ya pide el destinatario con confirmación ("se emite la guía y no se puede deshacer"):

```json
// POST /api/v1/advisor/leads/{id}/close
{ "expected_version": 3,
  "destinatario": { "nombre": "María González", "telefono": "+57 310 456 7890",
                    "direccion": "Cra 1 # 40-20, Zona Industrial Acopi, Yumbo" } }
// 200
{ "lead_id": "…", "stage": "VENTA_CERRADA", "version": 4, "numero_guia": "TLX-274914-CO" }
```

## Lo que el front ya adoptó de CR-007 (con mocks)

- `version` en tarjetas y detalle; todo cambio envía `expected_version`. Un 409
  `VERSION_DESACTUALIZADA` avisa al asesor y recarga el tablero.
- Sin "Deshacer" después de `VENTA_CERRADA` ni de `DESCARTADO`.
- `motivo` obligatorio al descartar.
- "Recolección" fuera del desglose.

Cuando publiquen el contrato 1.6.0, el front cambia `src/features/advisor-crm/api/crm-api.ts` a las
rutas `/api/v1/advisor/*` y al login real.

## Bloqueo a resolver: dos logins distintos en `POST /api/v1/auth/login`

El `main` del front (`bc1ab8e`, `docs/auth.md`) ya implementa un login de **clientes** contra
`POST /api/v1/auth/login` y `GET /api/v1/auth/me`, con **cookie httpOnly** `tlx_session` y roles
`USUARIO`/`ENCARGADO`/`ADMIN` (cita una rama `feat/roles-aprobacion-tarifas` que no está en el repo
del backend). CR-007 propone la **misma ruta** para el personal, pero con token `tlxs_` como Bearer y
roles `ASESOR`/`SUPERVISOR`. Son incompatibles.

Pedimos definir, junto con quien lleva el login del front:

1. ¿Un solo `/auth/login` para clientes y personal, o rutas separadas (p. ej. `/auth/staff/login`)?
2. ¿Cookie httpOnly o Bearer para el personal? En el navegador preferimos cookie: el token no queda
   expuesto a JavaScript.
3. ¿Existirá `GET /auth/me` para el personal (nombre, iniciales, roles, disponibilidad)?

## Prueba contra el backend publicado

Con `https://travel-tales-definitions-henderson.trycloudflare.com` (1.5.0) y el front en
`VITE_API_MOCKING=asesor`, que simula solo el CRM:

- `GET /tracking/{guia}` funciona desde la pantalla del asesor (`TLX-551904-CO`, `TLX-984021-CO`,
  `TLX-310482-CO`).
- `POST /chat/messages` responde. `GET /handoffs` pide el token administrativo (403).
- `/api/v1/auth/*` y `/api/v1/advisor/*` responden 404: todavía no existen.
