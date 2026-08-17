# History completa, control de Contributions y Map

Status: ready-for-human

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

76-90 y 137-145.

## What to build

Convertir History en la vista histórica de un Diary unificado. Diary combina Memories reveladas, Journal Entries manuales y hitos calculados en History, Calendar y Map. Las Memories del ritual no llevan ubicación y quedan fuera de Map; las Journal Entries admiten pasado, presente o futuro, fotos privadas, Thread y un pin exacto confirmado manualmente.

## Acceptance criteria

- [x] Diary sustituye las pestañas separadas de History y Map y ofrece History, Calendar y Map, conservando `/history` y `/map` como redirecciones compatibles.
- [x] History combina Memories reveladas, Journal Entries vividas y una franja de Journal Entries o hitos próximos con orden estable.
- [x] Calendar proyecta Memories, Journal Entries, cumpleaños y aniversario; las recurrencias anuales no clonan entradas persistentes.
- [x] El detalle de una Journal Entry muestra título, descripción, fechas, autor, fotos privadas, ubicación confirmada y Thread; las Memories mantienen su detalle y Thread.
- [x] Las Journal Entries admiten pasado, presente o futuro, rango, hora opcional, repetición anual, hasta diez fotos y ocultación del widget.
- [x] Map muestra exclusivamente Journal Entries con ubicación confirmada, diferencia `Vivido` y `Por vivir`, agrupa pines cercanos y abre su ficha inferior.
- [x] La ubicación es opcional, foreground-only y manual: buscar, mover, recentrar y confirmar no guarda nada antes de confirmar; las Memories del ritual nunca aparecen en Map.
- [x] Cualquiera de los dos miembros puede editar o eliminar una Journal Entry mediante control de versión; los Threads pueden apuntar a una Memory o a una Journal Entry.
- [x] Coordinates, etiquetas y media quedan protegidas por la Pair, las fotos se almacenan privadas y las URLs se sirven con caducidad.
- [x] La cuota gratuita de creación es atómica e idempotente; editar entradas existentes no depende de Premium y las entradas no alteran Progress ni Streak.
- [x] Web ofrece una alternativa listada para Diary/Calendar/ubicaciones sin intentar renderizar el mapa nativo.
- [x] Archive Mode conserva la lectura permitida, bloquea nuevas mutaciones no autorizadas y mantiene los controles de eliminación/privacidad definidos.
- [x] Las pruebas de dominio, controller y pgTAP cubren fechas, recurrencia, bisiestos, orden mixto, widget, RLS, cuota, concurrencia, media, Threads y terceros.

## Blocked by

- [07 - Thread de conversación dentro de una Memory](07-thread-de-memory.md)
- [08 - Photo Moment con doble cámara estilo BeReal](08-photo-doble-camara.md)
- [09 - Doodle Moment colaborativo en tiempo real](09-doodle-colaborativo.md)

## Comments

### 2026-08-17 - Sustituido por Diary unificado

- ADR-0010 sustituye la ubicación por ciudad en Memories: las Memories del ritual quedan fuera de Map.
- History pasa a ser una vista de Diary y Map se alimenta solo de Journal Entries manuales con pin confirmado.
- La implementación de ciudad aproximada se reemplaza en el siguiente slice; no debe ampliarse.

### 2026-08-17 - Implementación de Diary, Calendar y Map

- `d073511`, `8c3a1dd`, `1609161`, `9788347` y `5410284` entregan el feature `journal`, el modelo `JournalEntry`, la migración `20260817160000_unified_diary.sql` y las proyecciones de History/Calendar/Map.
- Se eliminaron `memory_locations` y las Important Dates personalizadas; cumpleaños y aniversario se calculan como hitos y los viajes pasan a ser Journal Entries.
- La verificación final cubre 25 suites y 111 tests Jest, 10 ficheros SQL y 242 aserciones pgTAP, typecheck, lint, smoke y exports Expo para web/iOS/Android. La validación visual final en dispositivos y la key de Google Maps para Android siguen siendo QA de entorno.
- QA: una Pair nueva sin fila en `pair_journal_state` ahora recibe explícitamente `freeEntryConsumed: false` y `canCreate: true`; se corrigió el RPC y se añadió una regresión de 37 aserciones en `unified_diary.test.sql`.
