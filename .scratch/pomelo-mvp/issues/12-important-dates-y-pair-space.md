# Important Dates y Pair space

Status: ready-for-agent

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

27 y 108-112.

## What to build

Crear un Pair space ligero que reúna cumpleaños, aniversario, viajes y fechas personalizadas sin mezclarlas con el ritual diario. La Pair debe ver y gestionar sus fechas y una cuenta atrás preparada para alimentar Widget Family.

## Acceptance criteria

- [ ] El Pair space muestra la birth date de cada Profile según permisos y el aniversario compartido de la Pair.
- [ ] Un miembro puede crear una Important Date de viaje o personalizada con nombre y fecha futura.
- [ ] Las reglas de edición distinguen fechas personales de Profile y fechas propiedad de la Pair.
- [ ] Editar o eliminar una Important Date actualiza ambos dispositivos y no deja cuentas atrás obsoletas.
- [ ] Se calcula y muestra de forma estable la siguiente Important Date, incluidos cambios de zona horaria y año.
- [ ] Una Important Date pasada sigue una regla explícita de repetición o archivo y no reaparece como futura por error.
- [ ] Existe un contrato de datos seguro y pequeño para que widgets puedan mostrar la próxima cuenta atrás.
- [ ] Crear, editar o alcanzar una Important Date no genera Memory, no avanza Streak y no incrementa Pom Progress.
- [ ] Un tercero no puede leer las fechas de una Pair y unlinking elimina su exposición en el dispositivo correspondiente.
- [ ] Pruebas cubren cumpleaños, aniversario, viaje, personalizada, edición, eliminación, recurrencia y zonas horarias.

## Blocked by

- [03 - Pair e Invitation mediante enlace o código](03-pair-e-invitation.md)

## Comments

