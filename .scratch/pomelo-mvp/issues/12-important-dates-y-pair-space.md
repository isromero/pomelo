# Important Dates y Pair space

Status: ready-for-human

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

27 y 108-112.

## What to build

Proyectar en Diary los hitos que pertenecen al Profile y a la Pair. Cumpleaños y aniversario se calculan desde sus fuentes autoritativas, mientras que viajes y fechas personalizadas dejan de ser un dominio separado y se crean como Journal Entries manuales. La próxima ocurrencia queda disponible para Calendar y el contrato de widget sin clonar recurrencias.

## Acceptance criteria

- [x] Diary proyecta el birth date de cada Profile según permisos y el aniversario compartido de la Pair.
- [x] Viajes y fechas personalizadas se crean como Journal Entries con título, fecha pasada/futura, rango, hora opcional, recurrencia y ocultación del widget.
- [x] Las reglas de edición mantienen los cumpleaños en Profile, el aniversario en Pair y el resto en Journal Entries editables por ambos miembros.
- [x] Calendar y History muestran los hitos y Journal Entries sin crear duplicados anuales persistentes.
- [x] Se calcula de forma estable la siguiente ocurrencia, incluidos cambios de año, bisiestos y zonas horarias.
- [x] Una ocurrencia pasada deja de ser candidata futura salvo que la Journal Entry sea anual y su siguiente ocurrencia corresponda.
- [x] Existe un contrato seguro para que widgets seleccionen la próxima Journal Entry, cumpleaños o aniversario elegible.
- [x] Crear, editar o alcanzar un hito o Journal Entry no genera Memory, no avanza Streak y no incrementa Pom Progress.
- [x] RLS y los RPC de Diary aíslan los hitos y Journal Entries de terceros; Archive Mode conserva la lectura permitida.
- [x] Las pruebas cubren hitos, recurrencia, fechas pasadas/futuras, bisiestos, orden mixto, selección de widget y zonas horarias.

## Blocked by

- [03 - Pair e Invitation mediante enlace o código](03-pair-e-invitation.md)

## Comments

- 2026-08-16 - Implementado en `766aa24` con Pair space, birth dates, aniversario, Important Dates, recurrencia, cuenta atrás, permisos, realtime y contrato seguro para widgets.
- 2026-08-16 - La validación de nombre y fecha ahora muestra el motivo concreto; `2000-12-12` se rechaza como fecha pasada. Correcciones en `7eea6f4` y `1c2a517`.
- 2026-08-16 - El contrato de datos para widgets está cubierto en este issue; el renderizado nativo de widgets queda para los issues 14 y 15.
- 2026-08-16 - Verificado con 17 suites y 83 tests Jest, `npm run typecheck`, `npm run lint` y la suite SQL de lifecycle/dates (141 aserciones).
- 2026-08-17 - ADR-0010 sustituye viajes y fechas custom por Journal Entries. Cumpleaños y aniversario permanecen como hitos calculados y el contrato de próxima fecha se mueve a Diary.
- 2026-08-17 - La migración y el feature `journal` eliminan el modelo personalizado anterior (`important_dates`) y mantienen solo Profile birthday, Pair anniversary y Journal Entries manuales.
