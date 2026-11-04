# Backend para la interfaz del ASESOR (CRM): qué existe y qué falta

Análisis de solo lectura de `/home/kenithdev/translogix-backend` (rama `main` en `e96a727`, contrato 1.3.0,
operaciones) frente a la interfaz del asesor de la rama `kenith-crm`. Fecha: 2026-11-04. Las rutas
de código son relativas a `backend/app/`, salvo que se indique otra cosa. Prefijo de la API: `/api/v1`.

## 0. Resumen

- **Ya sirve:** tracking (`GET /tracking/{guia}`), motor de cotización con desglose completo y
  guardado en `quotes`, mensajes exactos guardados en `messages`, handoffs con prioridad, cola,
  criterio, guía y confianza, búsqueda RAG híbrida (existe como servicio, pero no como endpoint),
  utilidades de PII y calendario de festivos.
- **No existe nada propio del CRM:** usuarios, roles, contacto del cliente (teléfono y correo), leads,
  etapas, notas, tareas, SLA, notificaciones, emisión de guías ni push. El bot nunca pide datos de
  contacto. Además, por diseño (DEC-S1, `contracts/common.py:64`), hoy el backend no guarda ni
  devuelve teléfonos.
- El bot promete "Te responderá en este mismo chat" (`modules/conversation/orchestrator.py:685`), y el
  `mensaje_cliente` de las reglas dice "voy a conectarte de inmediato". Las dos frases contradicen el
  modelo de llamada o `wa.me`.
- **P0:** login con rol de asesor, captura obligatoria de teléfono y correo con creación del lead o
  caso, tablas del CRM, tableros A y B con movimiento de etapa, detalle (transcripción, notas,
  cotización), SLA, notificaciones por _polling_, búsqueda RAG y tareas. **P1:** el embudo C
  (seguimiento automático), SSE, búsqueda global y vista interna de la guía.

### Actualización tras `git pull` (commit `e96a727`, envíos masivos B2B, contrato 1.3.0)

El back ahora tiene un módulo de envíos B2B (`app/shipments`, `app/clients`, `docs/SHIPMENT_BATCHES_P0.md`).
Esto cambia lo siguiente del CRM:

- **La guía ya se puede emitir.** `ShipmentRepository.next_guia()`
  (`app/shipments/infrastructure/repositories.py:32`) toma la secuencia PostgreSQL `shipment_guide_seq`
  (rango reservado 200000–299999, DEC-SHP1) y `ShipmentRepository.add` guarda envío, destinatario y la
  cotización congelada. Ya no hace falta la tabla `guias_emitidas`: la "Venta cerrada" crea un
  `shipments`. Para eso hay que ajustar dos cosas:
  - `shipments.client_id` es `NOT NULL` y FK a `enterprise_clients`. Un lead B2C del bot web no tiene
    cliente empresarial. Propuesta: `client_id` nullable + `lead_id` FK nueva, con
    `CHECK (client_id IS NOT NULL OR lead_id IS NOT NULL)`.
  - El destinatario es obligatorio (`nombre`, `telefono`, `direccion`; DEC-SHP9). Al cerrar la venta, el
    asesor tiene que capturarlo: el front necesita un formulario de cierre (no está en el diseño).
- **El tracking no muestra guías internas** (DEC-SHP8: son secuenciales y el tracking es público). La
  guía de una venta cerrada daría 404 en `GET /tracking/{guia}`. `GET /advisor/tracking/{guia}`
  (autenticado) pasa de P1 a **P0**.
- **Migración:** la `0002` ya existe (`0002_shipments_p0.py`). La del CRM es
  `0003_crm_asesor.py` con `down_revision="0002"`.
- **Contrato:** 1.3.0 ya está tomado. El CRM sube a **1.4.0**.
- **Errores:** `NO_AUTENTICADO` (401) ya existe. Falta solo un 409 para versión desactualizada
  (`CONFLICTO`; `IDEMPOTENCIA_CONFLICTO` es otro caso).
- **Autenticación:** `Authorization: Bearer` ya lo usa la API key B2B (`tlx_<prefijo>_<secreto>`,
  esquema `api_key` en `contracts/api_spec.py:96`). El JWT del asesor puede ir en el mismo header, pero
  con su propio esquema de seguridad y su dependencia (`current_advisor`) en las rutas `/advisor/*`.
  Nunca se aceptan en la misma ruta.
- Sigue sin existir nada propio del CRM (asesores, leads, notas, tareas, SLA, captura de teléfono en
  el bot).

## 1. Lo que ya existe y se puede reutilizar

| Capacidad                    | Dónde                                                                                                                                     | Uso en el CRM                                                                                                                                        | Limitación                                                                                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tracking TMS                 | `GET /tracking/{guia}`, `main.py:282`; `tracking/service.py:96`                                                                           | Herramientas → buscar guía; timeline de la pestaña Cotización/Tracking                                                                               | Dataset simulado de 5 guías y solo lectura (`TmsPort`, `contracts/ports.py:149`); vista sin PII                                                                      |
| Registro TMS interno         | `DatasetTmsAdapter.get_shipment`, `tracking/service.py:93`                                                                                | Empresa remitente, NIT, peso real/volumétrico/liquidado y valor declarado de una guía                                                                | Sin endpoint; contiene PII, así que solo debe exponerse a un rol autenticado                                                                                         |
| Cotización                   | `POST /cotizar`, `main.py:293`; `QuotationService.quote`, `quotation/service.py:50`; tabla `quotes` (`db/models.py:74`, con `session_id`) | Tarjeta A (ruta, peso facturable, valor) y desglose (flete base, seguro, recargos, peso volumétrico) en `CalculoFlete` (`contracts/quotation.py:53`) | No hay endpoint de listado ni de detalle. No existe "recolección" en la fórmula ni en la matriz CSV                                                                  |
| Transcripción                | Tabla `messages` (`db/models.py:44`); armado en `GET /chat/sessions/{id}/history`, `main.py:362`                                          | Pestaña Transcripción del bot                                                                                                                        | Es un endpoint del cliente (`X-Client-Id` opcional), no del asesor. El texto entrante se guarda tal cual (`db/repositories.py:114`)                                  |
| Handoffs                     | `GET/PATCH /handoffs*`, `main.py:645-675`; `HandoffPayload`, `contracts/escalation.py:169`                                                | Embudo B: `prioridad`, `cola_destino`, `triggers[]` (criterio y evidencia), `confidence_score_promedio`, `numero_guia_consultada`                    | Solo 3 estados (`PENDING/ASSIGNED/CLOSED`) sin retroceso (`escalation/handoff.py:22`); sin número `CAS-`, sin asesor, sin SLA ni cliente. No usar `resumen_contexto` |
| Motor de escalamiento        | `escalation/engine.py` (CRIT-001 a 005, INFO-INTENTOS)                                                                                    | "Motivo detectado" = criterio primario + categoría del JSON de reglas                                                                                | CRIT-004 no puede dispararse hasta marcar un NIT como GOLD en el fixture                                                                                             |
| Búsqueda RAG                 | `RagService.retrieve`, `rag/service.py:196` (pgvector + BM25, sin LLM)                                                                    | Herramientas → buscar en la base con fragmento citable                                                                                               | Sin endpoint. `ChunkMetadata` (`contracts/rag.py:31`) no tiene página: las fuentes son `.md` sin marcas de página                                                    |
| PII                          | `find_pii` / `redact_pii`, `contracts/pii.py:72,77`; `hash_user`, `conversation/service.py:35`                                            | Detectar y enmascarar teléfono y correo; HMAC para buscar sin texto plano                                                                            | —                                                                                                                                                                    |
| Días hábiles                 | `shared/business_days.py`, `data/fixtures/festivos_colombia.json`                                                                         | SLA en horario laboral (P1)                                                                                                                          | Solo días, no horas                                                                                                                                                  |
| Métricas                     | `GET /metrics/channels`, `main.py:677`                                                                                                    | Ninguno directo (es por canal)                                                                                                                       | Público                                                                                                                                                              |
| Autenticación administrativa | `X-Admin-Token`, `shared/http.py:116`; `AdminTokenDep`, `contracts/api_spec.py:85`                                                        | Mantenerlo solo para `reindex`                                                                                                                       | Token único sin identidad: no puede ir en el bundle del front                                                                                                        |

**Sobra para este módulo (el CRM no debe usarlo):** `/channels/whatsapp/*` (`main.py:484,504,529`),
`render_whatsapp` (`main.py:413`) y las variables `WHATSAPP_*`. `/channels/pbx/*` (`main.py:626,631`)
tampoco aplica: la llamada la hace el navegador con `tel:`. El contrato `WS /ws/chat/{session_id}`
(`contracts/ws.py:15`) es para el chat del cliente, no está implementado y el CRM no lo necesita.

## 2. Por pantalla

**1. Dashboard**

- Sirve: los conteos de handoffs por estado y prioridad, a partir de la tabla `handoffs`.
- Ampliar: nada reutilizable directamente; `channel_counters` (`db/repositories.py:315`) solo cuenta por canal.
- Falta: `GET /advisor/dashboard` con los leads de cotización de hoy y de ayer (zona horaria de Bogotá), los casos abiertos y cuántos son de prioridad alta, las llamadas pendientes y la próxima (a partir de `crm_tasks`), el % de SLA frente a la meta y las "acciones prioritarias" ordenadas por `sla_due_at`.

**2. Embudos**

- **A Ventas:**
  - Sirve: la ruta, `peso_facturable_kg`, `flete_total_cop` y el tipo de carga (`requiere_cadena_frio` / `mercancia_peligrosa`) salen de `quotes`.
  - Falta: la entidad lead y sus etapas; nombre, teléfono, segmento B2B/B2C (por NIT o empresa capturados), "hace cuánto", asesor asignado, la suma de COP por etapa, y emitir la guía `TLX-XXXXXX-CO` al cerrar, reutilizando `shipments` y `shipment_guide_seq` (ver la actualización tras el pull).
- **B Casos:**
  - Sirve: la guía vinculada, el motivo (`triggers[0]`), la confianza del bot (`confidence_score_promedio`, `null` si no hubo RAG; mostrar "N/D") y la prioridad.
  - Ampliar: `handoffs` con `CAS-xxxx`, 4 etapas (hoy hay 3 estados sin retroceso), asesor, SLA y cliente con teléfono. Mapear `Prioridad` (NORMAL/ALTA/URGENTE, `contracts/escalation.py:47`) a Alta/Media/Baja (§10).
- **C Seguimiento:**
  - Falta todo: etapas, intento n/3, próxima acción, _scheduler_ y canal (§9). "Tomar control manual" = mover el lead de C a A.
- **Comunes a los tres:**
  - Falta: mover de etapa con concurrencia optimista (`version`) y deshacer, y el historial de cambios de etapa.

**3. Detalle del lead o caso**

- Sirve: la transcripción (`messages`, con la misma lógica de `main.py:362-410`), el desglose de la cotización (`quotes.request_json` + `response_json`) y el timeline TMS (`GET /tracking/{guia}`).
- Ampliar:
  - Exponer la transcripción con autenticación de asesor y sin `X-Client-Id`.
  - El tracking debe reconocer las guías emitidas por el CRM, que hoy darían 404.
- Falta:
  - Una cabecera con nombre, segmento, teléfono, empresa y selector de etapa.
  - Notas internas y registro de llamadas (contestó, no contestó o buzón), recordatorios y el historial de eventos del sistema.
  - "Recolección" no existe en la fórmula `provisional-v1` (§10).

**4. Herramientas**

- Sirve: buscar guía con `GET /tracking/{guia}`.
- Falta:
  - `POST /advisor/rag/search`, que envuelve `RagService.retrieve` y devuelve el fragmento completo con `doc_code`, `doc_title`, `section_path` y `chunk_id`. La **página no existe**: se cita la sección. Dar página exige reingerir desde PDF con marcas (P2).
  - P1: una vista interna de la guía para el asesor.

**5. Mis tareas**

- Falta: la agenda (`crm_tasks`) con crear, completar y reprogramar, y `GET /advisor/metrics/sla` (cumplimiento, vencidos, tiempo medio al primer contacto, desglose por prioridad).

**6. Barra superior**

- Falta:
  - Login con rol y `GET /advisor/me` (nombre e iniciales).
  - Estado Disponible/Ocupado.
  - Búsqueda global (guía, teléfono por hash, nombre o empresa).
  - Notificaciones con contador. El `X-Admin-Token` escrito a mano debe desaparecer del front.

## 3. Autenticación y roles (P0)

- Tabla `advisors` y roles `ASESOR` (ve lo suyo y lo no asignado), `SUPERVISOR` (todo, reasigna, métricas de equipo) y `ADMIN` (reindexado).
- Sin registro público: se crean los asesores con un comando (`uv run python -m app.cli create-advisor`).
- `POST /auth/login` (correo y contraseña, hash argon2) devuelve un JWT HS256 de 60 min. En P1, refresh en cookie httpOnly y `logout`.
- Dependencia `current_advisor(roles=...)` para todo `/advisor/*`. `/handoffs*` acepta el JWT además del `X-Admin-Token`, por compatibilidad.
- Dependencias nuevas: `pyjwt`, `pwdlib[argon2]` y `cryptography`. Variables: `AUTH_JWT_SECRET`, `AUTH_ACCESS_TTL_MINUTES` y `PII_ENCRYPTION_KEY`. Hay que actualizar `contracts/env.py` y `.env.example`, porque el test `test_env_example_lists_exactly_the_canonical_names_without_secrets` los compara.
- Errores: `NO_AUTENTICADO` (401) ya existe; añadir `CONFLICTO` (409, versión desactualizada). `NO_AUTORIZADO` sigue en 403.
- CORS (`main.py:761-764`): añadir el header `Authorization` y los métodos `PUT` y `DELETE`, y poner `expose_headers=["X-Request-ID"]`.

## 4. Captura obligatoria de contacto y creación del lead o caso (cambios en el orquestador, P0)

1. **Disparadores:**
   - Cotización completada (`orchestrator.py:414`, después de `self._quotes.add`).
   - Pedido de asesor o cualquier escalamiento (`_apply_escalation`, `orchestrator.py:607`, tras `self._handoffs.create`, línea 654).
   - Guardar también `state.slots["ultima_cotizacion_id"]`: hoy solo se guardan los slots, no el `cotizacion_id`.
2. **Subflujo `state.slots["contacto"]`**, en este orden:
   1. Consentimiento de tratamiento de datos (Ley 1581 de 2012), con respuesta rápida "Acepto".
   2. **Teléfono** (obligatorio).
   3. **Correo** (obligatorio).
   4. Nombre y empresa o NIT (opcional; define B2B o B2C).
   - Validación: celular `3xx` o fijo `60x`, normalizado a E.164 `+57…` (se reutilizan los patrones de `contracts/pii.py:35-36`); correo con `contracts/pii.py:50`. Máximo 2 reintentos por campo.
3. **Orden en `respond()` (`orchestrator.py:163`):** el subflujo de contacto debe evaluarse **antes** de `_still_waiting` (línea 168). Si no, una sesión ya `ESCALATED` se traga la respuesta con el teléfono. También va antes de la detección de intención (`intents.by_rules`).
4. **Al validar el teléfono, en la misma transacción del turno** (commit en `conversation/service.py:131`), un nuevo `CrmService` inyectado en `Container.orchestrator` (`main.py:164`):
   - Hace _upsert_ de `contacts` por `phone_hash`.
   - Si el origen es una cotización, crea un `leads` (embudo A, `NUEVA_COTIZACION`).
   - Si es un escalamiento, enlaza `handoffs.contact_id` y el caso aparece en B.
   - En ambos casos: calcula `sla_due_at` y notifica.
   - El correo, que llega después, actualiza el contacto.
5. **Pedido de asesor con una cotización en la sesión y sin palabras clave ni sentimiento de CRIT-002:** crear un lead en A con `origen=SOLICITUD_ASESOR`, no un caso. Hoy todo "hablar con asesor" se trata como CRIT-002 con prioridad ALTA y cola SUPERVISOR (`engine.py:149`).
6. **Textos al cliente:**
   - Reemplazar el de `orchestrator.py:685` y el `mensaje_cliente` del `HANDOFF_NOTICE` por "Un asesor te llamará al ···4567 en los próximos N min". No se edita el JSON fuente: se sobrescribe en el orquestador.
   - Mostrar el teléfono siempre enmascarado: `ClientSafeText` rechaza el número completo.
7. **Persistencia:** en los turnos de captura, guardar el texto entrante redactado (`[TELÉFONO]`, `[CORREO]`) en `messages`. Así la transcripción y `HandoffPayload.historial` no llevan PII.
8. **P1:** bloque nuevo `CONTACT_REQUEST` en `contracts/reply.py`, con el campo pedido y el `inputmode`, para que el widget muestre un input de teléfono o correo. En P0 basta con un `TEXT`. Añadir también `interactive_reply_id` a `ChatMessageRequest` (riesgo R2 del backend).

## 5. Modelo de datos: migración `backend/migrations/versions/0003_crm_asesor.py` (`down_revision="0002"`)

| Tabla               | Columnas clave                                                                                                                                                                                                                                                                                                                                                                                                           | Notas                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `advisors`          | `id` uuid PK, `email` UNIQUE, `full_name`, `role`, `password_hash`, `availability` (DISPONIBLE/OCUPADO), `availability_at`, `is_active`, `last_login_at`, `created_at`                                                                                                                                                                                                                                                   | Las iniciales se derivan de `full_name`                                                                                                                                                 |
| `contacts`          | `id`, `external_user_id_hash` (idx; enlaza con la sesión web), `phone_enc`, `phone_hash` UNIQUE, `phone_last4`, `email_enc`, `email_hash` idx, `full_name`, `company_name`, `nit_enc`, `nit_hash`, `segment` (B2B/B2C), `phone_verified_at`, `consent_at`, `consent_version`, `created_at`, `updated_at`                                                                                                                 | `_enc` = Fernet con `PII_ENCRYPTION_KEY`; `_hash` = HMAC con `PII_HASH_SALT`                                                                                                            |
| `leads`             | `id`, `contact_id` FK, `session_id` idx, `cotizacion_id` FK→`quotes`, `origin` (COTIZACION/SOLICITUD_ASESOR), `pipeline` (VENTAS/SEGUIMIENTO), `stage`, `owner_id` FK→`advisors`, `valor_cotizado_cop` bigint, `numero_guia`, `discard_reason`, `sla_due_at`, `first_contact_at`, `followup_attempt` smallint, `next_followup_at`, `next_followup_action`, `version` int, `stage_changed_at`, `created_at`, `updated_at` | Índices `(pipeline, stage)`, `owner_id` y `next_followup_at` (parcial)                                                                                                                  |
| `handoffs` (ALTER)  | `+case_number` int UNIQUE (secuencia `crm_case_seq` → `CAS-0042`), `+stage` (ESCALADO_IA/EN_GESTION/VALIDANDO_OPS/RESUELTO), `+contact_id`, `+owner_id`, `+prioridad_crm` (ALTA/MEDIA/BAJA), `+sla_due_at`, `+first_response_at`, `+resolved_at`, `+version`, `+updated_at`                                                                                                                                              | Backfill de las 10 filas existentes. `status` se mantiene sincronizado con `stage` (PENDING↔ESCALADO_IA, ASSIGNED↔EN_GESTION/VALIDANDO_OPS, CLOSED↔RESUELTO) para no romper el contrato |
| `crm_events`        | `id`, `entity_type` (LEAD/CASE), `entity_id`, `kind` (NOTE, CALL, WA_ME, STAGE_CHANGE, GUIDE_CREATED, FOLLOWUP_SENT, PII_VIEW, SYSTEM), `advisor_id`, `call_outcome` (CONTESTO/NO_CONTESTO/BUZON), `body`, `from_stage`, `to_stage`, `undo_of`, `created_at`                                                                                                                                                             | Índice `(entity_type, entity_id, created_at)`. Es el timeline y la auditoría                                                                                                            |
| `crm_tasks`         | `id`, `entity_type`, `entity_id`, `advisor_id`, `kind` (LLAMADA/RECORDATORIO), `due_at` idx, `done_at`, `note`, `created_at`                                                                                                                                                                                                                                                                                             | Agenda y "próxima llamada"                                                                                                                                                              |
| `notifications`     | `id`, `advisor_id`, `kind`, `entity_type`, `entity_id`, `title`, `created_at`, `read_at`                                                                                                                                                                                                                                                                                                                                 | Índice `(advisor_id, read_at)`. Una fila por asesor                                                                                                                                     |
| `shipments` (ALTER) | `client_id` nullable, `+lead_id` FK→`leads`, `CHECK (client_id IS NOT NULL OR lead_id IS NOT NULL)`                                                                                                                                                                                                                                                                                                                      | Reemplaza la tabla `guias_emitidas` propuesta antes: la guía sale de `shipment_guide_seq`                                                                                               |

## 6. Endpoints propuestos (todos con JWT, salvo login)

| P   | Método y ruta                                                         | Request                                                            | Response (resumen)                                                                                                                                                                                 |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0  | `POST /auth/login`                                                    | `{email, password}`                                                | `{access_token, expires_in, asesor:{id, nombre, iniciales, rol, disponibilidad}}`                                                                                                                  |
| P0  | `GET /advisor/me` · `PUT /advisor/me/availability`                    | `{estado: DISPONIBLE\|OCUPADO}`                                    | `asesor`                                                                                                                                                                                           |
| P0  | `GET /advisor/dashboard`                                              | `?fecha=`                                                          | `{kpis:{leads_cotizacion_hoy, leads_cotizacion_ayer, casos_abiertos, casos_alta, llamadas_pendientes, proxima_llamada, sla_cumplimiento_pct, sla_meta_pct}, acciones_prioritarias[], server_time}` |
| P0  | `GET /advisor/boards/{ventas\|casos\|seguimiento}`                    | `?owner=me\|all&q=`                                                | `{stages:[{id, label, count, cop_proyectado}], cards:[…], server_time}`                                                                                                                            |
| P0  | `PATCH /advisor/leads/{id}/stage` · `PATCH /advisor/cases/{id}/stage` | `{stage, expected_version, motivo_descarte?}`                      | `{card, change_id, numero_guia?}`. Pasar a VENTA_CERRADA emite la guía en la misma transacción; versión vieja → 409                                                                                |
| P0  | `POST /advisor/stage-changes/{change_id}/undo`                        | —                                                                  | entidad restaurada (ventana de 30 s, mismo asesor; si se creó un envío, pasa a un estado anulado: hay que definirlo, hoy solo existe `REGISTRADO`)                                                 |
| P0  | `GET /advisor/leads/{id}` · `GET /advisor/cases/{id}`                 | —                                                                  | cabecera (teléfono E.164 completo, correo, empresa, NIT enmascarado, etapa, responsable, `sla_due_at`) + cotización (request + response) + guía + criterio y confianza (casos)                     |
| P0  | `GET /advisor/sessions/{session_id}/transcript`                       | —                                                                  | `SessionHistory` (el mismo esquema de `main.py:362`)                                                                                                                                               |
| P0  | `GET` y `POST /advisor/{leads\|cases}/{id}/timeline`                  | POST: `{tipo: NOTA\|LLAMADA, resultado?, texto, recordatorio_at?}` | eventos (+ tarea si hay recordatorio)                                                                                                                                                              |
| P0  | `POST /advisor/{leads\|cases}/{id}/contact-attempts`                  | `{canal: TEL\|WA_ME}`                                              | evento; fija `first_contact_at`                                                                                                                                                                    |
| P0  | `GET /advisor/notifications` · `POST /advisor/notifications/read`     | `?since=&unread=` / `{ids[]\|all}`                                 | `{unread_count, items[]}` / 204                                                                                                                                                                    |
| P0  | `POST /advisor/rag/search`                                            | `{query, doc_codes?, top_k≤10}`                                    | `items[{chunk_id, doc_code, doc_title, section_path, texto, score, cita}]`                                                                                                                         |
| P0  | `GET`/`POST /advisor/tasks` · `PATCH /advisor/tasks/{id}`             | `{entity_type, entity_id, kind, due_at, nota}` / `{done\|due_at}`  | tarea(s) con cliente y entidad                                                                                                                                                                     |
| P1  | `GET /advisor/metrics/sla`                                            | `?periodo=hoy\|7d\|30d`                                            | `{cumplimiento_pct, meta_pct, en_sla, vencidos, t_medio_primer_contacto_min, por_prioridad[]}`                                                                                                     |
| P1  | `GET /advisor/search`                                                 | `?q=` (detecta guía, teléfono o texto)                             | `{guias[], leads[], casos[]}`                                                                                                                                                                      |
| P1  | `POST /advisor/leads/{id}/take-control`                               | —                                                                  | lead en VENTAS/EN_CONTACTO, responsable = yo, se cancela el seguimiento                                                                                                                            |
| P1  | `GET /advisor/stream` (SSE)                                           | `?ticket=` (de un solo uso)                                        | `lead.created`, `case.created`, `sla.warning`, `sla.breached`, `lead.reactivated`, `task.due`                                                                                                      |
| P0  | `GET /advisor/tracking/{guia}`                                        | —                                                                  | vista interna (empresa, pesos real/volumétrico/liquidado, valor declarado) + guías emitidas                                                                                                        |
| P1  | `POST /auth/refresh` · `POST /auth/logout`                            | cookie                                                             | token                                                                                                                                                                                              |

Tarjetas:

- **A:** `{id, stage, segmento, creado_en, nombre, telefono_mask, telefono_verificado, origen, destino, peso_facturable_kg, tipo_carga, valor_cotizado_cop, owner, sla_due_at, version}`.
- **B:** `{id, case_number, prioridad_crm, numero_guia, motivo{criterio, categoria, evidencia}, confianza_bot, sla_due_at, cliente, telefono_mask, version}`.
- **C:** `{id, stage, agente, intento, max_intentos:3, proxima_accion{tipo, at}, canal}`.

**Proceso del repo (contract-first):** cada endpoint se declara primero en `contracts/api_spec.py`.
Luego se regeneran `contracts/openapi.yaml`, los esquemas y los tipos (`python -m app.contracts`), se
actualiza `test_surface_matches_section_5_plus_additions_and_websocket` y el contrato sube a 1.4.0
en `contracts/CHANGELOG.md`.

## 7. SLA (P0 con minutos de reloj; P1 con horario laboral)

- Configuración en `data/config/sla.json`. Valores propuestos, a validar con negocio:
  - Primer contacto de un lead: 15 min.
  - Casos: Alta 30 min, Media 2 h, Baja 8 h.
  - Meta de cumplimiento: 90 %.
  - Aviso al consumir el 80 % del plazo.
- `sla_due_at = created_at + objetivo`, fijado al crear el lead o el caso.
  - Lead: `first_contact_at` = primer `contact-attempt` o la primera nota de tipo LLAMADA.
  - Caso: `first_response_at` = paso a EN_GESTION.
- **Cumplimiento % = en plazo / (en plazo + vencidos)** en la ventana. Los ítems abiertos con el plazo ya vencido cuentan como vencidos.
- El backend devuelve `sla_due_at` + `server_time`, y el cronómetro lo pinta el front (así se evita el desfase de reloj).
- P1: horario laboral (L-V 7–19, sábado 8–13, hora de Bogotá) y festivos (`shared/business_days.py`). También un SLA de resolución por caso.

## 8. PII: enmascarar y permitir

- En reposo: teléfono, correo y NIT cifrados (`_enc`) + HMAC (`_hash`) para buscar y deduplicar; `phone_last4` para mostrar. Nunca en logs: `shared/logging.py` ya redacta.
- Listas y tableros: `+57 3•• ••• 4567`.
- Detalle: E.164 completo solo para ASESOR o SUPERVISOR, sobre un ítem propio o sin asignar. Cada lectura queda registrada como `crm_events.kind=PII_VIEW`. El front arma `tel:` y `https://wa.me/57…?text=…`; el backend no envía nada.
- "Teléfono verificado" no puede significar verificado por OTP: no hay SMS ni WhatsApp. Se propone `phone_verified_at` = la primera llamada con resultado "contestó".
- Transcripción redactada en origen (§4.7). El cliente solo ve el teléfono enmascarado.

## 9. Tiempo real, notificaciones y seguimiento automático

- **P0, polling:** el front consulta `GET /advisor/notifications?since=` y el tablero cada 10–15 s. Las notificaciones se crean en la misma transacción que el evento (lead o caso nuevo, reactivación, tarea por vencer) y desde el _job_ de SLA.
- **P1, SSE:** `GET /advisor/stream`, unidireccional, más simple que WebSocket. Usa un _broadcaster_ en proceso que se publica después del commit. Con varios workers, `LISTEN/NOTIFY` de Postgres (`asyncpg.add_listener`). `EventSource` no envía headers, así que el JWT va como _ticket_ de un solo uso en la query.
- **Scheduler (P1):** no existe ninguno (`IDLE_REMINDER_MINUTES_WEB_CHAT`, `shared/config.py:45`, nunca se usa). Propuesta: un bucle asyncio en el `lifespan` (`main.py:751`) cada 60 s, con `SELECT … FOR UPDATE SKIP LOCKED` sobre `leads.next_followup_at <= now()` y sobre los SLA cerca de vencer.
- **Embudo C:** Nutrición inicial (resumen de la cotización) → Recordatorio 24 h → Expirado al 3.er intento sin respuesta. Reactivado: el mismo `client_id` (`contacts.external_user_id_hash`) vuelve al chat o abre el enlace del correo.
  - **Canal: decisión pendiente.** Sin WhatsApp quedan tres opciones:
    - **(a) Correo:** recomendado; el correo ya es obligatorio. Para la demo, SMTP contra Mailpit o Mailtrap.
    - **(b) Notificación web push:** requiere PWA, _service worker_ y permiso; poco alcance.
    - **(c) Mensaje al volver al chat:** solo es reactivo.
  - Mientras no se decida, el _job_ registra los intentos con `delivery_mode=SIMULATED`, igual que hoy los canales simulados.

## 10. Decisiones pendientes (negocio y producto)

1. Canal del seguimiento automático (§9). También qué lead entra a C en lugar de A. Propuesta: lead creado fuera de horario, o 2 intentos "no contestó/buzón" en A.
2. Mapeo de prioridad a Alta/Media/Baja. Propuesta:
   - URGENTE (CRIT-005) y ALTA por CRIT-002 (palabras clave o sentimiento), CRIT-003 o CRIT-004 → **Alta**.
   - CRIT-001 (baja confianza) y pedido explícito de asesor → **Media**.
   - Casos manuales o INFO-INTENTOS → **Baja**.
3. Si el cliente no da el teléfono:
   - Cotización: queda anónima, sin lead.
   - Escalamiento: el handoff se crea igual. ¿Se muestra en B como "sin contacto" (por ejemplo, CRIT-005 urgente)?
4. "Recolección" en el desglose: no está en la matriz de tarifas ni en `CalculoFlete`. Se quita de la UI o se define como un recargo configurable.
5. Destinatario al cerrar la venta: `shipments` lo exige (DEC-SHP9). ¿Lo pide el bot, o lo captura el asesor en un formulario de cierre? ¿Qué estado tiene un envío anulado por "Deshacer"?
6. Página en las citas RAG: se mantiene la sección o se reingiere desde PDF.

## 11. Lista ordenada de tareas

**P0 (demo de punta a punta)**

1. Dependencias y variables de autenticación y cifrado (`pyjwt`, `pwdlib`, `cryptography`; `contracts/env.py`, `.env.example`).
2. Migración `0003_crm_asesor`: tablas de §5, ALTER de `handoffs`, secuencia `CAS` y backfill. Modelos y repositorios.
3. `advisors`, comando de alta, `POST /auth/login`, `current_advisor`, `GET /advisor/me` y disponibilidad. Errores 401 y 409. CORS.
4. `CrmService`: _upsert_ de contacto (cifrado + HMAC), crear lead, enlazar caso, SLA y notificación.
5. Orquestador: subflujo de consentimiento → teléfono → correo (→ nombre y empresa) antes de `_still_waiting`, `ultima_cotizacion_id`, redacción de los turnos de captura, textos "te llamaremos" y lead de ventas cuando se pide asesor tras cotizar.
6. Tableros A y B con conteos y COP por etapa. Cambio de etapa con `version`, deshacer y emisión de la guía `TLX-XXXXXX-CO` al cerrar.
7. Detalle de lead y caso, transcripción para el asesor, timeline, notas y llamadas, `contact-attempts` y `GET /advisor/tracking/{guia}` (guías internas, DEC-SHP8).
8. Dashboard (KPIs + acciones prioritarias), tareas (CRUD) y notificaciones por _polling_.
9. `POST /advisor/rag/search` sobre `RagService.retrieve`.
10. Contrato 1.4.0 (`api_spec.py`, `openapi.yaml`, tipos TS, CHANGELOG) y tests con transacción revertida de la captura de contacto, la creación del lead, el cambio de etapa y el login.

**P1**

11. _Scheduler_ + embudo C (+ `take-control`), con el canal decidido; mientras tanto, simulado.
12. SSE `GET /advisor/stream` y avisos `sla.warning` / `sla.breached`.
13. SLA en horario laboral con festivos; `GET /advisor/metrics/sla`.
14. Búsqueda global; refresh y logout.
15. Bloque `CONTACT_REQUEST` y `interactive_reply_id` en el Web Chat; deduplicación de leads por contacto.
16. Auditoría `PII_VIEW` consultable por el supervisor; reasignación de leads y casos; autoasignación por disponibilidad.

**P2**

17. Páginas en las citas RAG (reingesta desde PDF con marcas).
18. "Recolección" como recargo de tarifa, si negocio lo define.
19. Retirar `X-Admin-Token` de `/handoffs*` cuando el front use solo JWT; proteger `/docs` y `/metrics/channels`.

## 12. Contrato provisional que ya usa el front (rama `kenith-crm`)

El front del asesor funciona hoy con MSW (`src/mocks/asesor-handlers.ts`) contra estas rutas
provisionales, definidas con Zod en `src/features/advisor-crm/api/crm-api.ts`. Cuando el backend
publique las suyas (§6), se cambia ese único archivo. No hay que tocar las pantallas.

| Front hoy (por confirmar)                             | Propuesta backend (§6)                             |
| ----------------------------------------------------- | -------------------------------------------------- |
| `GET`/`PATCH /asesor/me`                              | `GET /advisor/me` · `PUT /advisor/me/availability` |
| `GET /asesor/dashboard`                               | `GET /advisor/dashboard`                           |
| `GET /asesor/embudos/{ventas\|casos\|bot}`            | `GET /advisor/boards/{…}`                          |
| `PATCH /asesor/leads/{id}` `{etapa}` → `guia_creada`  | `PATCH /advisor/{leads\|cases}/{id}/stage`         |
| Deshacer = otro `PATCH` a la etapa anterior           | `POST /advisor/stage-changes/{id}/undo`            |
| `POST /asesor/leads/{id}/tomar-control`               | `POST /advisor/leads/{id}/take-control`            |
| `GET /asesor/leads/{id}` (incluye transcripción)      | `GET /advisor/leads/{id}` + `…/transcript`         |
| `POST /asesor/leads/{id}/notas`                       | `POST /advisor/{leads\|cases}/{id}/timeline`       |
| `GET /asesor/tareas` · `PATCH /asesor/tareas/{id}`    | `GET /advisor/tasks` · `PATCH /advisor/tasks/{id}` |
| `GET /asesor/buscar?q=`                               | `GET /advisor/search`                              |
| `GET /asesor/rag/buscar?q=` (`pagina` puede ser nula) | `POST /advisor/rag/search` (cita por sección)      |
| `GET /tracking/{guia}` (real)                         | igual; P1 `GET /advisor/tracking/{guia}`           |

Notas del front:

- No hay "Resumen IA" (AI Handoff Summary): la pestaña **Datos** muestra solo `datos_bot`, los datos
  estructurados que capturó el bot.
- La confianza del bot se muestra en palabras (baja, media, alta) y con una barra, nunca como
  porcentaje (regla del `CLAUDE.md` del front).
- El tablero se refresca cada 30 s (_polling_) mientras no haya SSE.
