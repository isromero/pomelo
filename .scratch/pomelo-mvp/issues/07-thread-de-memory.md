# Thread de conversación dentro de una Memory

Status: ready-for-human

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

60 y 80-82.

## What to build

Permitir que una Pair continúe una conversación concreta después de Reveal mediante un Thread de texto ligado a esa Memory. La experiencia debe sentirse como una prolongación de las Contributions reveladas, no como un chat general que compita con otras aplicaciones.

## Acceptance criteria

- [x] Solo una Memory revelada puede tener Thread y ambos miembros de su Pair pueden abrirlo.
- [x] Los mensajes aparecen bajo las Contributions reveladas con alineación de conversación coherente.
- [x] Enviar un mensaje actualiza al otro cliente en tiempo razonable y los reintentos no producen duplicados.
- [x] Un User ajeno a la Pair no puede leer ni escribir mensajes mediante RLS.
- [x] Cada mensaje conserva autor y fecha y responde correctamente a logout, unlinking y Archive Mode.
- [x] El Thread admite texto en el MVP y no ofrece media, llamadas, presencia, recibos de lectura ni chat global.
- [x] Se emite un evento seguro para que el issue de notificaciones pueda avisar de una respuesta sin incluir el contenido privado.
- [x] Pruebas con dos Users cubren creación, actualización en tiempo real, autorización, retry y apertura desde Memory.

## Blocked by

- [04 - Question: primer Moment completo hasta Memory](04-question-hasta-memory.md)

## Comments

### 2026-08-17 - Generalización a Diary

- `19a629b` implementa Thread de Memory con texto, realtime, eventos sin cuerpo privado, RLS y reintentos idempotentes.
- El modelo se generaliza en `8c3a1dd` y `d073511`: cada mensaje apunta exactamente a una Memory o a una Journal Entry, y Diary reutiliza el mismo panel contextual.
- `supabase/tests/database/photo_doodle_thread.test.sql` y `unified_diary.test.sql` cubren autorización, Archive Mode, eventos y Threads de Journal Entry.
