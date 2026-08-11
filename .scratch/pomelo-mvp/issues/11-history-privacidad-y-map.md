# History completa, control de Contributions y Map

Status: ready-for-agent

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

76-90 y 137-145.

## What to build

Convertir la History mínima en el archivo conjunto real de la Pair. Debe combinar Memories de Question, Photo y Doodle, abrir detalles y Threads, aplicar controles posteriores sobre Contributions y ubicación, y ofrecer un Map de solo lectura basado exclusivamente en ciudades aproximadas autorizadas.

## Acceptance criteria

- [ ] History lista únicamente Moments revelados y mantiene orden cronológico estable al paginar o refrescar.
- [ ] Question, Photo y Doodle se distinguen sin romper una estructura común de Memory.
- [ ] El detalle muestra Prompt, Contributions disponibles, fecha, Pom y ciudad aproximada cuando exista.
- [ ] Una Memory revelada permanece accesible indefinidamente mientras las reglas de archivo permitan al User verla.
- [ ] Añadir ubicación es opcional, se solicita en contexto y guarda ciudad aproximada en vez de coordenadas compartidas precisas.
- [ ] El User puede retirar la ubicación y el cambio desaparece de detalle, Map, widgets y URLs derivadas.
- [ ] Map solo muestra Memories con ubicación vigente, es de solo lectura y abre el detalle correspondiente.
- [ ] El User puede ocultar o eliminar su propia Contribution y no puede eliminar directamente la aportación de su pareja.
- [ ] Cuando una Contribution deja de estar disponible, la otra persona ve un placeholder estable de `Contenido eliminado` y la Memory no se rompe.
- [ ] Photo y Doodle se sirven mediante acceso temporal autorizado y no dejan URLs públicas permanentes o cachés visibles después de logout.
- [ ] Archive Mode conserva lectura permitida y bloquea mutaciones no autorizadas o nuevos Moments.
- [ ] Pruebas con dos Users y un tercero cubren History, paginación, Map, eliminación, acceso temporal, revocación y aislamiento de Pair.

## Blocked by

- [07 - Thread de conversación dentro de una Memory](07-thread-de-memory.md)
- [08 - Photo Moment con doble cámara estilo BeReal](08-photo-doble-camara.md)
- [09 - Doodle Moment colaborativo en tiempo real](09-doodle-colaborativo.md)

## Comments

