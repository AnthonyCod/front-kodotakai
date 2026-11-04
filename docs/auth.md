# Login, roles y aprobación de envíos

Implementado en el backend (contrato 1.3.0, CR-001 a CR-003, rama `feat/roles-aprobacion-tarifas`).
Con `VITE_API_MOCKING=true` el front usa MSW con capturas reales (`src/mocks/fixtures/envios.json`) y
los usuarios de prueba de `src/mocks/fixtures/users.json`. En el backend se cargan con
`uv run python -m app.modules.auth.seed ../data/fixtures/usuarios_demo.json`.

## Roles

`USUARIO` < `ENCARGADO` < `ADMIN`. Cada rol incluye los permisos de los de abajo.

| Sección                                   | Sin sesión | Usuario | Encargado | Admin |
| ----------------------------------------- | ---------- | ------- | --------- | ----- |
| Chat, sucursales, info, tarifas, rastrear | sí         | sí      | sí        | sí    |
| Cotizar / revisar Excel                   | sí         | sí      | sí        | sí    |
| Solicitar envío, `/mis-envios`            | pide login | sí      | sí        | sí    |
| Crear lote (`POST /envios/lote`)          | pide login | sí      | sí        | sí    |
| `/admin`, `/admin/tarifas`                | no         | no      | no        | sí    |

El encargado no tiene pantallas propias en el front por ahora.

Ocultar rutas en el front es solo interfaz: **el backend valida el rol en cada endpoint**.

## Endpoints

La sesión va en la **cookie httpOnly** `tlx_session` (`SameSite=Lax`; `Secure` salvo `SESSION_COOKIE_SECURE=false`). El front nunca guarda tokens y
envía `credentials: 'include'` solo en estas llamadas. Si el front y la API están en dominios
distintos, CORS debe permitir credenciales para el origen del front (sin `*`).

| Método y ruta              | Cuerpo                | Respuesta                                             |
| -------------------------- | --------------------- | ----------------------------------------------------- |
| `POST /api/v1/auth/login`  | `{ email, password }` | `200` usuario + cookie · `401 CREDENCIALES_INVALIDAS` |
| `GET /api/v1/auth/me`      | —                     | `200` usuario · `401 NO_AUTENTICADO`                  |
| `POST /api/v1/auth/logout` | —                     | `200 { sesion_cerrada: true }` y borra la cookie      |

Usuario: `{ "id": "…", "nombre": "…", "email": "…", "rol": "USUARIO" | "ENCARGADO" | "ADMIN" }`.
Errores con el sobre de siempre: `{ "error": { "code", "message", "details", "request_id" } }`.

## Solicitud y aprobación de envíos

Una cotización pasa a envío solo cuando un encargado la aprueba. El precio queda congelado al cotizar.

| Método y ruta                              | Rol       | Respuesta                                 |
| ------------------------------------------ | --------- | ----------------------------------------- |
| `POST /api/v1/cotizaciones/{id}/solicitar` | USUARIO   | `201` solicitud `PENDIENTE` · `409` si ya |
| `GET /api/v1/mis-envios`                   | USUARIO   | `{ items: [solicitud] }`                  |
| `GET /api/v1/solicitudes?estado=`          | ENCARGADO | bandeja                                   |
| `POST /api/v1/solicitudes/{id}/aprobar`    | ENCARGADO | `APROBADA` con `numero_guia`              |
| `POST /api/v1/solicitudes/{id}/rechazar`   | ENCARGADO | `{ motivo }` → `RECHAZADA`                |

Sin sesión: `401 NO_AUTENTICADO`; rol insuficiente: `403 NO_AUTORIZADO`.

## Pendiente

- `POST /envios/lote` (carga masiva) aún no existe en el backend; el front lo tiene con MSW.
- `GET /tracking/{guia}` todavía no conoce las guías creadas al aprobar.
- Reemplazar `X-Admin-Token` por la sesión con rol en los endpoints de asesor y reindexado.
