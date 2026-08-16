# Question: primer Moment completo hasta Memory

Status: ready-for-human

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

31-51, 56-59 y 76-79.

## What to build

Entregar el primer tracer bullet del producto con dos miembros: la Pair recibe el mismo Question Moment, cada miembro envía una Contribution privada, el estado pasa a ready, cualquiera ejecuta Reveal y el sistema crea exactamente una Memory visible en una History mínima. Este slice sustituye el estado simulado actual por lifecycle y autorización reales.

## Acceptance criteria

- [x] Una Pair activa recibe como máximo un Moment para su día local y ambos miembros ven el mismo Prompt.
- [x] El primer Moment usa el Prompt gratuito diseñado específicamente, no una selección aleatoria.
- [x] Question admite texto corto o una única elección A/B/C según el Prompt.
- [x] Cada miembro puede editar antes de enviar y no puede editar después de confirmar la Contribution.
- [x] Después de enviar, el User ve que su Contribution está guardada y que falta su pareja, sin conocer la respuesta ajena.
- [x] RLS y el contrato de consulta impiden que un miembro lea la Contribution de la pareja antes de Reveal, incluso fuera de la UI.
- [x] El Moment solo pasa a ready cuando existen las dos Contributions requeridas.
- [x] Cualquiera de los dos miembros puede ejecutar Reveal y el resultado queda revelado para ambos.
- [x] Reveal es atómico e idempotente y crea exactamente una Memory aunque ambos clientes reintenten simultáneamente.
- [x] La Memory conserva Prompt, dos Contributions, fecha y estado de Pom previsto, y aparece en una History cronológica mínima.
- [x] Las respuestas reveladas se muestran como conversación, con la propia a la derecha y la pareja a la izquierda, sin perder texto largo.
- [x] Una prueba end-to-end con dos Users demuestra Pair -> Question -> Contributions ocultas -> ready -> Reveal -> Memory -> History.

## Blocked by

- [03 - Pair e Invitation mediante enlace o código](03-pair-e-invitation.md)

## Comments

- Tracer-bullet validado en `question_memory.test.sql` (33 aserciones), migración de lifecycle y superficies Home/Moment/History.
