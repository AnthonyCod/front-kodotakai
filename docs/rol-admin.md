# Rol ADMIN: qué falta en el backend

Este documento sirve para pasárselo al equipo de backend. Recoge lo que hay que crear para que todo lo
que ve el administrador salga de endpoints reales. La base es el contrato 1.3.0 (rama
`feat/roles-aprobacion-tarifas`). Todo lo que está en «Lo que falta» es una **propuesta (por
confirmar)**; si se acepta, va como CR en `docs/contract-change-requests.md`.

## El rol

`USUARIO` < `ENCARGADO` < `ADMIN`. El administrador hereda todo lo que puede hacer el encargado
(aprobaciones, bandeja de asesor, métricas, simulador). Además tiene lo suyo: tarifas, usuarios e
inteligencia de negocio. Cada endpoint valida el rol con la cookie `tlx_session`: `401 NO_AUTENTICADO`
si no hay sesión y `403 NO_AUTORIZADO` si el rol no alcanza.

## Pantallas del admin y su estado

| Pantalla del front      | Endpoint                                       | Estado                   |
| ----------------------- | ---------------------------------------------- | ------------------------ |
| `/admin/tarifas`        | `GET\|POST /admin/tarifas`, `PATCH …/{codigo}` | Listo (CR-002)           |
| `/admin/usuarios`       | —                                              | **Falta** (A)            |
| Reindexar RAG           | `POST /admin/rag/reindex` con `X-Admin-Token`  | **Cambiar a sesión** (B) |
| `/admin` (inteligencia) | — (hoy se calcula con el chat del navegador)   | **Falta** (C)            |
| Historial de una tarifa | —                                              | **Falta** (D, opcional)  |

## Lo que falta

### A. Gestión de usuarios (prioridad alta)

No hay registro público. Hoy los usuarios solo se crean con
`python -m app.modules.auth.seed`, así que el admin necesita crear encargados y otros admins desde la
app.

| Método y ruta                             | Cuerpo                                  | Respuesta                                      |
| ----------------------------------------- | --------------------------------------- | ---------------------------------------------- |
| `GET /api/v1/admin/usuarios?rol=&activo=` | —                                       | `{ items: [UsuarioAdmin] }`                    |
| `POST /api/v1/admin/usuarios`             | `{ email, nombre, rol, password }`      | `201 UsuarioAdmin` · `409` si el correo existe |
| `PATCH /api/v1/admin/usuarios/{id}`       | `{ nombre?, rol?, activo?, password? }` | `UsuarioAdmin`                                 |

`UsuarioAdmin`: `{ id, nombre, email, rol, activo, creado_en, ultimo_ingreso | null }`.

Reglas:

- El correo se normaliza (trim y minúsculas) y es único. La contraseña tiene como mínimo 10
  caracteres y se guarda con scrypt, como en el login.
- `activo=false`, un cambio de `rol` o un cambio de `password` borran las sesiones abiertas de ese
  usuario (`user_sessions`).
- El admin no puede desactivarse ni bajarse el rol a sí mismo, y no puede quedar el sistema sin ningún
  admin activo. Ambos casos responden `409 CONFLICTO`.
- Las contraseñas no se devuelven nunca y no van a los logs.
- BD: la tabla `users` necesita la columna `ultimo_ingreso` (se actualiza en el login).

### B. Quitar `X-Admin-Token` de lo que usa el equipo

El token compartido obliga a que el asesor lo escriba en el navegador. Con la sesión ya no hace falta:

| Endpoint                              | Hoy             | Propuesto               |
| ------------------------------------- | --------------- | ----------------------- |
| `GET /handoffs`, `GET /handoffs/{id}` | `X-Admin-Token` | Sesión, rol `ENCARGADO` |
| `PATCH /handoffs/{id}`                | `X-Admin-Token` | Sesión, rol `ENCARGADO` |
| `GET /metrics/channels`               | Público         | Sesión, rol `ENCARGADO` |
| `POST /admin/rag/reindex`             | `X-Admin-Token` | Sesión, rol `ADMIN`     |

Para no romper scripts que ya existen, durante una versión se aceptan las dos formas (token o sesión).
Después se retira el token. Retirarlo es un cambio MAJOR del contrato. Cuando esto esté, el front
quita el campo «Token de asesor» de la bandeja.

### C. Inteligencia de negocio con datos reales

Hoy `/admin` arma sus gráficas con la conversación guardada en el navegador. Para que muestre la
operación real hace falta un endpoint de solo lectura que agregue los datos de la BD.

`GET /api/v1/admin/insights?desde=&hasta=` (fechas ISO con offset; por defecto, los últimos 30 días):

```json
{
  "desde": "2026-10-05T00:00:00-05:00",
  "hasta": "2026-11-04T23:59:59-05:00",
  "rutas": [
    {
      "codigo_trayecto": "TLX-BOG-MED-001",
      "origen": "Bogotá D.C.",
      "destino": "Medellín",
      "cotizaciones": 42,
      "solicitudes": 18,
      "aprobadas": 15,
      "rechazadas": 2,
      "valor_cotizado_cop": 3150000,
      "valor_aprobado_cop": 1120000
    }
  ],
  "solicitudes_por_estado": { "PENDIENTE": 3, "APROBADA": 40, "RECHAZADA": 5 },
  "tiempo_medio_aprobacion_minutos": 37,
  "handoffs_por_cola": [{ "cola": "RECLAMOS", "total": 6 }],
  "handoffs_por_prioridad": [{ "prioridad": "ALTA", "total": 4 }],
  "consultas_por_intencion": [{ "intencion": "TRACKING", "total": 120 }]
}
```

De dónde sale cada dato:

| Dato                  | Fuente                                                               |
| --------------------- | -------------------------------------------------------------------- |
| `rutas`               | `quotes` (`response_json.ruta`, `calculo.flete_total_cop`, `estado`) |
| Tiempos de aprobación | `quotes.revisado_en − solicitado_en`                                 |
| Handoffs              | `handoffs.payload_json`                                              |
| Intenciones           | `audit_events.intent`                                                |

Sin datos personales: solo conteos y montos. El rol requerido es `ADMIN`.

### D. Historial de cambios de tarifas (opcional)

Sirve para saber quién cambió un precio y cuándo. Las cotizaciones ya solicitadas no cambian, porque
su precio quedó congelado.

- BD: tabla `tariff_route_changes (id, codigo_trayecto, user_id, cambios_json, creado_en)`. Se escribe
  en cada `POST` o `PATCH` de `/admin/tarifas`, con el valor de antes y el de después.
- `GET /api/v1/admin/tarifas/{codigo_trayecto}/historial` → `{ items: [{ usuario, cambios, creado_en }] }`.

## Orden sugerido

1. **A. Usuarios.** Sin esto, el admin no puede dar acceso a nadie.
2. **B. Sesión en vez de token.** Cierra el endpoint de métricas, que hoy es público.
3. **C. Insights.**
4. **D. Historial.**

En cada paso: modelos en `backend/app/contracts/`, rutas en `api_spec.py`, `EXPECTED_SURFACE`,
ejemplos, `uv run python -m app.contracts`, `contracts/types/generate.sh`, una migración nueva y el
CHANGELOG. El front agrega su pantalla cuando el endpoint exista y lo prueba contra capturas reales.
