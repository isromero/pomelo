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
- [ ] Crear, editar, eliminar o repetir una Journal Entry futura programa, reprograma o cancela su aviso para ambos miembros sin duplicados.
- [ ] El aviso de Journal Entry respeta fecha civil, hora opcional, zona horaria y Locale del destinatario, y abre su detalle dentro de Diary.

## Blocked by

- [06 - Lifecycle resistente, recuperación y Streak](06-lifecycle-recuperacion-y-streak.md)
- [07 - Thread de conversación dentro de una Memory](07-thread-de-memory.md)

## Comments

### 2026-08-17 - Próximos planes de Diary

- ADR-0010 añade avisos para Journal Entries futuras. La cadencia exacta se decidirá dentro de este issue; el slice de Diary solo entrega fechas, recurrencia y deep-link target.

### 2026-08-17 - Estado de implementación

- Diary ya expone fecha civil, rango, hora opcional, zona horaria, recurrencia anual y el deep link `pomelo://diary?entryId=...` que necesitará el scheduler.
- No se han implementado todavía programación, reprogramación, cancelación ni entrega de notificaciones para Journal Entries; permanecen dentro del alcance de este issue.
