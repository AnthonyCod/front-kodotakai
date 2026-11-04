# Solicitud al backend: módulo Asesor (CRM)

Base: `translogix-backend` en `e96a727` (contrato 1.3.0). Detalle técnico, archivos y líneas en
[`asesor-backend-faltantes.md`](asesor-backend-faltantes.md).

El front del asesor ya está hecho (rama `kenith-crm` de `front-kodotakai`) y funciona con datos
simulados. Para conectarlo al backend real hace falta lo siguiente. Reglas del producto: **no se usa
la API de WhatsApp** (el asesor llama con `tel:` o abre `wa.me` desde el navegador) y **no se
implementa el "resumen IA"**.

## P0: imprescindible para la demo

1. **Login del asesor:** `POST /auth/login` con JWT, roles `ASESOR`/`SUPERVISOR`/`ADMIN`, y
   `GET /advisor/me` con el estado Disponible/Ocupado. Reemplaza el `X-Admin-Token` escrito a mano.
2. **El bot pide teléfono y correo, obligatorios**, al terminar una cotización o al escalar. Con el
   teléfono crea el lead (embudo de ventas) o enlaza el caso (embudo de casos). Va antes de
   `_still_waiting` (`orchestrator.py:168`). Cambiar el texto "Te responderá en este mismo chat"
   (`orchestrator.py:685`) por "Un asesor te llamará".
3. **Migración `0003_crm_asesor`:** `advisors`, `contacts` (teléfono, correo y NIT cifrados + hash),
   `leads`, `crm_events`, `crm_tasks`, `notifications`; ALTER de `handoffs` (`CAS-xxxx`, 4 etapas,
   asesor, SLA) y de `shipments` (`client_id` nullable + `lead_id`).
4. **Tableros** de ventas y casos con conteo y COP por etapa; **cambio de etapa** con versión y
   deshacer. Al pasar a "Venta cerrada" se crea el envío y la guía con `next_guia()` (lo de envíos
   masivos ya sirve).
5. **Detalle** del lead o caso: datos capturados, transcripción, notas y llamadas
   (contestó/no contestó/buzón) con recordatorio, desglose de la cotización y
   `GET /advisor/tracking/{guia}` para guías internas (hoy el tracking público no las muestra).
6. **Dashboard, tareas y SLA:** KPIs del turno, acciones por vencer, agenda de llamadas y % de SLA.
7. **Notificaciones** por _polling_ y **búsqueda RAG** (`POST /advisor/rag/search` sobre
   `RagService.retrieve`).
8. Contrato **1.4.0** declarado primero en `contracts/api_spec.py`, con tests.

## P1

Embudo de seguimiento automático del bot y "tomar control", SSE, SLA en horario laboral, búsqueda
global.

## Decisiones que necesitamos

1. **Canal del seguimiento automático** sin WhatsApp: correo (recomendado), web push o solo cuando
   el cliente vuelve al chat.
2. **Destinatario al cerrar la venta:** `shipments` lo exige. ¿Lo pide el bot o lo captura el asesor
   en un formulario de cierre (que el front tendría que añadir)?
3. **Prioridad Alta/Media/Baja** a partir de NORMAL/ALTA/URGENTE y los criterios de escalamiento.
4. **Cliente que no deja teléfono:** ¿la cotización queda sin lead? ¿El caso urgente se muestra
   "sin contacto"?
5. **"Recolección"** en el desglose: no existe en la fórmula. ¿Se quita o se vuelve un recargo?
6. **Estado del envío anulado** cuando el asesor deshace un cierre (hoy solo existe `REGISTRADO`).

El contrato provisional que usa hoy el front, y cómo se mapea a estas rutas, está en la §12 del
informe. Cuando el backend publique el suyo, el front solo cambia
`src/features/advisor-crm/api/crm-api.ts`.
