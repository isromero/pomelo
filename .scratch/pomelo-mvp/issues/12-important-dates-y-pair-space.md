# Important Dates y Pair space

Status: ready-for-human

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

27 y 108-112.

## What to build

Crear un Pair space ligero que reúna cumpleaños, aniversario, viajes y fechas personalizadas sin mezclarlas con el ritual diario. La Pair debe ver y gestionar sus fechas y una cuenta atrás preparada para alimentar Widget Family.

## Acceptance criteria

- [x] El Pair space muestra la birth date de cada Profile según permisos y el aniversario compartido de la Pair.
- [x] Un miembro puede crear una Important Date de viaje o personalizada con nombre y fecha futura.
- [x] Las reglas de edición distinguen fechas personales de Profile y fechas propiedad de la Pair.
- [x] Editar o eliminar una Important Date actualiza ambos dispositivos y no deja cuentas atrás obsoletas.
- [x] Se calcula y muestra de forma estable la siguiente Important Date, incluidos cambios de zona horaria y año.
- [x] Una Important Date pasada sigue una regla explícita de repetición o archivo y no reaparece como futura por error.
- [x] Existe un contrato de datos seguro y pequeño para que widgets puedan mostrar la próxima cuenta atrás.
- [x] Crear, editar o alcanzar una Important Date no genera Memory, no avanza Streak y no incrementa Pom Progress.
- [x] Un tercero no puede leer las fechas de una Pair y unlinking elimina su exposición en el dispositivo correspondiente.
- [x] Pruebas cubren cumpleaños, aniversario, viaje, personalizada, edición, eliminación, recurrencia y zonas horarias.

## Blocked by

- [03 - Pair e Invitation mediante enlace o código](03-pair-e-invitation.md)

## Comments

- 2026-08-16 - Implementado en `766aa24` con Pair space, birth dates, aniversario, Important Dates, recurrencia, cuenta atrás, permisos, realtime y contrato seguro para widgets.
- 2026-08-16 - La validación de nombre y fecha ahora muestra el motivo concreto; `2000-12-12` se rechaza como fecha pasada. Correcciones en `7eea6f4` y `1c2a517`.
- 2026-08-16 - El contrato de datos para widgets está cubierto en este issue; el renderizado nativo de widgets queda para los issues 14 y 15.
- 2026-08-16 - Verificado con 17 suites y 83 tests Jest, `npm run typecheck`, `npm run lint` y la suite SQL de lifecycle/dates (141 aserciones).
