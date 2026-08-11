# Analítica Pair-first y diagnóstico sin contenido privado

Status: ready-for-agent

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

151-155.

## What to build

Instrumentar el embudo real de Pomelo para medir si una Pair alcanza valor, vuelve y compra, manteniendo completamente fuera de la analítica sus respuestas, fotos, trazos y mensajes. Añadir diagnóstico operativo suficiente para distinguir fallos de producto, backend, permisos, native surfaces y compras.

## Acceptance criteria

- [ ] Existe una taxonomía versionada para cuenta, Profile, Pair, Invitation, Moment, Contribution, ready, Reveal, Memory, Thread, paywall, compra, restore, Streak y widgets.
- [ ] Los eventos permiten reconstruir el embudo hasta segundo, tercer y séptimo Moment completado a nivel Pair.
- [ ] Activación, conversión y retención usan un identificador Pair estable; métricas User se reservan para diagnóstico.
- [ ] Instalación, tipo de widget, opt-in, Streak salvado o perdido y resultado de compra se registran con propiedades mínimas definidas.
- [ ] Ningún evento, error o log contiene texto de Contribution, mensajes, imágenes, URLs firmadas, trazos o códigos de Invitation completos.
- [ ] Consentimiento y configuración de analítica respetan los requisitos de las tiendas y la política de privacidad acordada.
- [ ] Los fallos distinguen red, Auth, RLS, Storage, Realtime, permisos, notificaciones, widgets, RevenueCat y webhooks sin exponer secretos.
- [ ] Eventos reintentados o webhooks duplicados no inflan conversiones o hitos Pair.
- [ ] Un entorno de desarrollo permite inspeccionar y validar eventos antes de enviarlos a producción.
- [ ] Pruebas automatizadas de esquema rechazan propiedades privadas o eventos incompletos y una auditoría manual valida el funnel completo.

## Blocked by

- [03 - Pair e Invitation mediante enlace o código](03-pair-e-invitation.md)
- [04 - Question: primer Moment completo hasta Memory](04-question-hasta-memory.md)
- [05 - Premium después del primer Reveal](05-premium-tras-primer-reveal.md)
- [06 - Lifecycle resistente, recuperación y Streak](06-lifecycle-recuperacion-y-streak.md)

## Comments

