# Thread de conversación dentro de una Memory

Status: ready-for-agent

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

60 y 80-82.

## What to build

Permitir que una Pair continúe una conversación concreta después de Reveal mediante un Thread de texto ligado a esa Memory. La experiencia debe sentirse como una prolongación de las Contributions reveladas, no como un chat general que compita con otras aplicaciones.

## Acceptance criteria

- [ ] Solo una Memory revelada puede tener Thread y ambos miembros de su Pair pueden abrirlo.
- [ ] Los mensajes aparecen bajo las Contributions reveladas con alineación de conversación coherente.
- [ ] Enviar un mensaje actualiza al otro cliente en tiempo razonable y los reintentos no producen duplicados.
- [ ] Un User ajeno a la Pair no puede leer ni escribir mensajes mediante RLS.
- [ ] Cada mensaje conserva autor y fecha y responde correctamente a logout, unlinking y Archive Mode.
- [ ] El Thread admite texto en el MVP y no ofrece media, llamadas, presencia, recibos de lectura ni chat global.
- [ ] Se emite un evento seguro para que el issue de notificaciones pueda avisar de una respuesta sin incluir el contenido privado.
- [ ] Pruebas con dos Users cubren creación, actualización en tiempo real, autorización, retry y apertura desde Memory.

## Blocked by

- [04 - Question: primer Moment completo hasta Memory](04-question-hasta-memory.md)

## Comments

