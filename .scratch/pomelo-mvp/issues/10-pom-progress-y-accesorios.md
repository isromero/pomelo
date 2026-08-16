# Pom, Progress y accesorios

Status: ready-for-agent

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

55 y 91-96.

## What to build

Convertir a Pom en la recompensa compartida del lifecycle real. Reveal debe producir una reacción breve, las Memories deben avanzar Progress y desbloquear cuatro accesorios gestionados desde un vestuario compartido, sin introducir necesidades, castigo o economía virtual. El slice consume un kit de diseño reemplazable compuesto por Pom, seis expresiones, tres reacciones animables y cuatro accesorios separados.

## Acceptance criteria

- [ ] El kit visual incluye Pom master y seis expresiones reutilizables: tranquilo, feliz, emocionado, sorprendido, cariñoso y orgulloso.
- [ ] El kit define tres reacciones animables mediante key poses: idle, Reveal y desbloqueo de accesorio.
- [ ] Reveal reproduce su reacción breve sin bloquear el acceso al resultado.
- [ ] Crear una Memory incrementa Progress una sola vez aunque Reveal o sus eventos se reintenten.
- [ ] Progress pertenece a la Pair, cuenta exclusivamente Memories reveladas y nunca disminuye.
- [ ] La primera Memory presenta a Pom y las Memories 2, 7, 14 y 30 desbloquean los accesorios 1, 2, 3 y 4 respectivamente.
- [ ] Question, Photo y Doodle revelados cuentan una vez; Threads, Important Dates, compras, aperturas, Contributions unilaterales y recuperación de Streak no cuentan.
- [ ] Existe un vestuario sencillo con preview de Pom, opción `Sin accesorio`, cuatro accesorios y el milestone visible de cada elemento bloqueado.
- [ ] Solo se equipa un accesorio a la vez; cualquiera de los dos miembros puede equiparlo o quitarlo y la última selección válida se sincroniza para la Pair.
- [ ] Romper Streak o expirar Premium no elimina desbloqueos; una Pair activa en Archive Mode puede seguir viendo y seleccionando lo ya obtenido.
- [ ] Home refleja el estado y accesorio actuales de Pom mediante el asset `Pom / Original` aprobado como referencia.
- [ ] Cada accesorio se entrega como asset separado, con anchor estable, variantes claro/oscuro y legibilidad comprobada en Home, Reveal y widgets.
- [ ] Los assets temporales pueden sustituirse por el arte final de la diseñadora sin cambiar el modelo de Progress ni rehacer las pantallas.
- [ ] Inactividad, pérdida de Streak, Archive Mode o cierre del paywall nunca muestran hambre, enfermedad, muerte, tristeza o culpa.
- [ ] No existen monedas, tienda, habitación, minijuegos, múltiples mascotas ni micropagos cosméticos.
- [ ] Pruebas de comportamiento verifican idempotencia de Progress, desbloqueos, selección y ausencia de estados punitivos.

## Blocked by

- [04 - Question: primer Moment completo hasta Memory](04-question-hasta-memory.md)

## Comments

### 2026-08-16 - Vestuario y desbloqueos

- Se confirma un vestuario compartido, no una tienda.
- La opción `Sin accesorio` permite retirar cualquier accesorio equipado.
- Los cuatro accesorios se desbloquean en las Memories 2, 7, 14 y 30.
- La diseñadora propondrá conceptos visuales; el comportamiento no depende de cuáles sean los cuatro objetos finales.
