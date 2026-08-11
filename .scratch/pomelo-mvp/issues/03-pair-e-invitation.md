# Pair e Invitation mediante enlace o código

Status: ready-for-agent

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

16-30.

## What to build

Crear el recorrido completo por el que un User abre una Pair, comparte una Invitation y el segundo User se vincula mediante enlace o código. Ambos deben terminar en el mismo estado de Pair activa con privacidad, límites de membresía y lifecycle de Invitation aplicados por el backend, incluyendo los primeros comportamientos de espera, cancelación, caducidad y desvinculación.

## Acceptance criteria

- [ ] Un User sin Pair puede crear una y obtiene una Invitation de un solo uso con enlace y código alternativo.
- [ ] El creador ve `Esperando a tu pareja` y puede reenviar o cancelar la Invitation pendiente.
- [ ] El enlace abre el destino correcto en una instalación nueva, una sesión existente y después de completar autenticación.
- [ ] El segundo User puede introducir el código manualmente y ve claramente la Pair que está aceptando.
- [ ] El segundo miembro completa sus datos personales, pero no vuelve a introducir el aniversario ya definido para la Pair.
- [ ] Aceptar una Invitation actualiza a ambos dispositivos y deja la Pair activa con exactamente dos miembros.
- [ ] Una Invitation cancelada, caducada, reutilizada o perteneciente a una Pair llena falla con un estado recuperable y sin membresías parciales.
- [ ] Un User no puede pertenecer a más de una Pair activa y un tercer User no puede unirse a una Pair completa.
- [ ] El aniversario se almacena una vez en la Pair y ambos miembros ven el mismo valor.
- [ ] El contrato inicial de desvinculación detiene nuevos Moments y conserva el acceso permitido en Archive Mode; la propagación completa a todas las superficies se finalizará en el issue 19.
- [ ] Dos clientes reales o equivalentes automatizados demuestran creación, invitación, aceptación, actualización en tiempo real y rechazo de acceso por terceros.

## Blocked by

- [02 - Cuenta, Profile y recuperación de sesión](02-cuenta-profile-y-sesion.md)

## Comments

