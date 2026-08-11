# Doodle Moment colaborativo en tiempo real

Status: ready-for-agent

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

68-75.

## What to build

Añadir Doodle como formato colaborativo explícitamente distinto de Question y Photo. Los dos miembros dibujan sobre el mismo lienzo en tiempo real, pueden reconocer sus aportaciones, sobreviven a latencia o reconexión y finalizan un único documento que pasa por ready, Reveal y Memory.

## Acceptance criteria

- [ ] Ambos miembros abren el mismo lienzo y los trazos de uno aparecen en el otro durante la sesión.
- [ ] Los trazos de cada miembro se distinguen de forma discreta sin convertir la interfaz en dos canvases.
- [ ] Las herramientas MVP incluyen pincel, cinco o seis colores, grosor, deshacer, borrar y limpiar.
- [ ] Undo y clear tienen reglas compartidas previsibles y no eliminan silenciosamente trabajo remoto confirmado.
- [ ] Los eventos de puntero se agrupan para transporte y no generan una escritura de Postgres por movimiento.
- [ ] Una pérdida temporal de conexión permite seguir o reanudar sin duplicar trazos ni corromper el orden final.
- [ ] El estado de presencia o sincronización indica si la pareja está conectada sin implementar un sistema general de presencia.
- [ ] Ambos miembros deben marcar finalización antes de que Doodle quede ready.
- [ ] Reveal crea exactamente una Doodle Memory a partir de un documento final persistido y reproducible.
- [ ] Ningún canvas todavía no revelado se expone en un widget o background del sistema.
- [ ] Una prueba con dos clientes, latencia y reconexión valida sincronización, finalización, Reveal y reapertura desde History.

## Blocked by

- [04 - Question: primer Moment completo hasta Memory](04-question-hasta-memory.md)

## Comments

