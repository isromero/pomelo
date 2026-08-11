# Horario, notificaciones y deep links

Status: ready-for-agent

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

46, 53, 81 y 97-104.

## What to build

Hacer que el ritual diario vuelva a llamar a cada miembro en el momento correcto sin recurrir a culpa. La Pair define una hora; el backend y los dispositivos coordinan disponibilidad, acciones de la pareja, ready, Reveal, vencimiento y respuestas de Thread, y cada notificación abre el estado exacto mediante deep link.

## Acceptance criteria

- [ ] La Pair puede elegir y modificar una hora diaria y ambos miembros ven la misma configuración compartida.
- [ ] La programación define de forma explícita qué ocurre cuando los miembros tienen zonas horarias distintas o cambian de zona.
- [ ] Cada User registra, renueva y revoca sus propios push tokens sin exponer los de su pareja.
- [ ] Se solicita permiso de notificaciones después de explicar su utilidad y denegarlo no bloquea el uso de la app.
- [ ] Se puede avisar cuando el Moment está disponible, cuando la pareja participa, cuando queda ready, cuando se revela y antes de expirar.
- [ ] Una respuesta nueva en Thread produce una notificación sin incluir el texto privado en analítica o payloads innecesarios.
- [ ] Cada notificación abre el Moment, Reveal o Thread correcto y resuelve sesión cerrada, onboarding incompleto y contenido ya caducado.
- [ ] Título, cuerpo, fechas y acciones de cada notificación se generan en el Locale del destinatario, incluso cuando los miembros usan idiomas distintos.
- [ ] El User puede silenciar recordatorios sin desactivar notificaciones transaccionales imprescindibles y puede reactivarlos.
- [ ] Reintentos, dos dispositivos del mismo User y eventos duplicados no producen una ráfaga de avisos repetidos.
- [ ] Pruebas deterministas cubren calendario y zonas horarias; pruebas en dispositivo real cubren recepción y deep links en iOS y Android.

## Blocked by

- [06 - Lifecycle resistente, recuperación y Streak](06-lifecycle-recuperacion-y-streak.md)
- [07 - Thread de conversación dentro de una Memory](07-thread-de-memory.md)

## Comments
