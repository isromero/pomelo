# Widget Family en iOS

Status: ready-for-agent

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

112-121.

## What to build

Entregar la Widget Family completa en iOS usando datos reales: estado del Moment con Pom y Streak, última Memory visual, distancia aproximada e Important Date. Cada modo debe respetar Reveal, consentimiento visual, sesión y privacidad, y abrir la superficie correcta de la app.

## Acceptance criteria

- [ ] El widget de estado muestra Pom, Streak y uno de `Te toca`, `Esperando`, `Listo para descubrir` o `Completado` según el estado autoritativo.
- [ ] Tocar el widget de estado abre el Moment o Reveal correcto incluso después de un arranque en frío.
- [ ] El widget de Memory muestra únicamente la última Photo o Doodle revelada y nunca una Contribution oculta.
- [ ] Photo usa la imagen de la pareja como principal y la propia como miniatura en una composición estilo BeReal.
- [ ] El contenido visual requiere opt-in explícito y puede ocultarse inmediatamente desde la app.
- [ ] El widget de distancia usa ciudades configuradas manualmente, muestra una aproximación o `Juntos` y nunca afirma ser GPS en vivo.
- [ ] El widget de próxima fecha elige la Journal Entry, cumpleaños o aniversario elegible más cercano y reacciona a edición, ocultación o eliminación.
- [ ] Cada widget ofrece tamaños compatibles con su contenido y estados vacíos que no filtran datos.
- [ ] Todos los textos y fechas del widget respetan el Locale del User y sus superficies permanecen legibles en las apariencias clara y oscura del sistema.
- [ ] Logout, unlinking, eliminación de Contribution o Journal Entry, retirada de ubicación y expiry actualizan o neutralizan el widget correspondiente.
- [ ] Los datos e imágenes compartidos con la extensión tienen ciclo de vida privado y no permanecen después de revocación.
- [ ] Pruebas en dispositivo verifican refresh, deep links, opt-in, Reveal, eliminación, sesión y estados sin red.

## Blocked by

- [08 - Photo Moment con doble cámara estilo BeReal](08-photo-doble-camara.md)
- [09 - Doodle Moment colaborativo en tiempo real](09-doodle-colaborativo.md)
- [10 - Pom, Progress y accesorios](10-pom-progress-y-accesorios.md)
- [11 - History completa, control de Contributions y Map](11-history-privacidad-y-map.md)
- [12 - Important Dates y Pair space](12-important-dates-y-pair-space.md)
- [13 - Horario, notificaciones y deep links](13-horario-notificaciones-y-deep-links.md)

## Comments

### 2026-08-17 - Contrato de próxima fecha preparado

- Diary expone `nextWidgetOccurrence`, que combina Journal Entries, cumpleaños y aniversario, excluye entradas ocultas y compara ocurrencias con fecha/hora/zona horaria.
- `WidgetEntryScreen` ya consume esa proyección y abre la Journal Entry correcta o Calendar mediante deep link.
- La Widget Family iOS completa, sus familias visuales, refresh nativo, opt-in de media y QA en dispositivo siguen pendientes de este issue.
