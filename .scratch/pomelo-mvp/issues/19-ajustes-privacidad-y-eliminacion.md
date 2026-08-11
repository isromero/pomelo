# Ajustes, privacidad y flujos destructivos completos

Status: ready-for-agent

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

13-15, 28-30, 83-87 y 132-145.

## What to build

Cerrar todos los controles de cuenta, Pair, Premium, permisos y datos para que el User pueda entender y cambiar su configuración o abandonar Pomelo sin estados residuales. Logout, unlinking y eliminación deben propagarse por backend, Storage, History, Map, Threads, widgets, notificaciones y dispositivos con confirmaciones acordes al impacto.

## Acceptance criteria

- [ ] Ajustes permite modificar nombre, avatar, birth date, ciudad, hora del Moment, Locale, Appearance y preferencias de notificación con permisos correctos.
- [ ] Cambiar Locale o Appearance actualiza la experiencia propia, persiste en Profile y no modifica las preferencias de la pareja.
- [ ] Se muestran estado de Pair, Subscriber/Premium, restore y acceso a la gestión nativa de la suscripción.
- [ ] Política de privacidad, términos de uso, contacto de soporte y reporte de Prompt son accesibles desde un lugar estable.
- [ ] Cámara, fotos, ubicación y notificaciones se solicitan únicamente en contexto y la app explica cómo recuperarse de una denegación.
- [ ] Logout revoca la sesión local y limpia media, URLs temporales, estado de widgets, tokens y datos privados en caché.
- [ ] Unlinking exige confirmación explícita, detiene nuevos Moments, archiva la antigua Pair y conserva Premium con el Subscriber.
- [ ] Cada exmiembro conserva únicamente el contenido permitido por el contrato de Archive Mode y no puede seguir escribiendo en la antigua Pair.
- [ ] El User puede ocultar o eliminar su Contribution y retirar ubicación; los cambios se propagan a History, Map, widgets, Threads derivados y Storage.
- [ ] Eliminar la cuenta explica el alcance, requiere confirmación fuerte y elimina o anonimiza los datos según la política definida.
- [ ] La eliminación no rompe Memories de la pareja: utiliza placeholders estables y revoca acceso al contenido retirado.
- [ ] Operaciones destructivas son idempotentes, toleran reintentos y ofrecen un estado de progreso o error recuperable.
- [ ] Pruebas end-to-end verifican logout, unlink, eliminación de Contribution, ubicación y cuenta desde dos dispositivos y todas las superficies derivadas.

## Blocked by

- [05 - Premium después del primer Reveal](05-premium-tras-primer-reveal.md)
- [11 - History completa, control de Contributions y Map](11-history-privacidad-y-map.md)
- [12 - Important Dates y Pair space](12-important-dates-y-pair-space.md)
- [13 - Horario, notificaciones y deep links](13-horario-notificaciones-y-deep-links.md)
- [14 - Widget Family en iOS](14-widget-family-ios.md)
- [15 - Widget Family equivalente en Android](15-widget-family-android.md)

## Comments
