# Doodle Moment colaborativo en tiempo real

Status: ready-for-human

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

68-75.

## What to build

Añadir Doodle como formato colaborativo explícitamente distinto de Question y Photo. Los dos miembros dibujan sobre el mismo lienzo en tiempo real, pueden reconocer sus aportaciones, sobreviven a latencia o reconexión y finalizan un único documento que pasa por ready, Reveal y Memory.

## Acceptance criteria

- [x] Ambos miembros abren el mismo lienzo y los trazos de uno aparecen en el otro durante la sesión.
- [x] Los trazos de cada miembro se distinguen de forma discreta sin convertir la interfaz en dos canvases.
- [x] Las herramientas MVP incluyen pincel, cinco o seis colores, grosor, deshacer, borrar y limpiar.
- [x] Undo y clear tienen reglas compartidas previsibles y no eliminan silenciosamente trabajo remoto confirmado.
- [x] Los eventos de puntero se agrupan para transporte y no generan una escritura de Postgres por movimiento.
- [x] Una pérdida temporal de conexión permite seguir o reanudar sin duplicar trazos ni corromper el orden final.
- [x] El estado de presencia o sincronización indica si la pareja está conectada sin implementar un sistema general de presencia.
- [x] Ambos miembros deben marcar finalización antes de que Doodle quede ready.
- [x] Reveal crea exactamente una Doodle Memory a partir de un documento final persistido y reproducible.
- [x] Ningún canvas todavía no revelado se expone en un widget o background del sistema.
- [x] Las pruebas de controller y base de datos validan sincronización, finalización, Reveal, reconexión y reapertura desde History.

## Blocked by

- [04 - Question: primer Moment completo hasta Memory](04-question-hasta-memory.md)

## Comments

### 2026-08-17 - Implementación verificada

- `19a629b` entrega Doodle colaborativo con documento persistido, transporte agrupado, sincronización realtime, finalización por ambos miembros y Reveal idempotente.
- `doodle-controller.test.ts` y `photo_doodle_thread.test.sql` cubren herramientas, reconexión, autorización, readiness, persistencia y privacidad pre-Reveal.
- La validación manual en dispositivos físicos queda como QA de lanzamiento, no como trabajo pendiente del slice funcional.
