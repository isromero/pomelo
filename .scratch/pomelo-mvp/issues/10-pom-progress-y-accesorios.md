# Pom, Progress y accesorios

Status: ready-for-human

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

55 y 91-96.

## What to build

Convertir a Pom en la recompensa compartida del lifecycle real. Reveal debe producir una reacción breve, las Memories deben avanzar Progress y desbloquear cuatro accesorios gestionados desde un vestuario compartido, sin introducir necesidades, castigo o economía virtual. El slice consume un kit de diseño reemplazable compuesto por Pom, seis expresiones, tres reacciones animables y cuatro accesorios separados.

## Acceptance criteria

- [x] El kit visual incluye Pom master y seis expresiones reutilizables: tranquilo, feliz, emocionado, sorprendido, cariñoso y orgulloso.
- [x] El kit define tres reacciones animables mediante key poses: idle, Reveal y desbloqueo de accesorio.
- [x] Reveal reproduce su reacción breve sin bloquear el acceso al resultado.
- [x] Crear una Memory incrementa Progress una sola vez aunque Reveal o sus eventos se reintenten.
- [x] Progress pertenece a la Pair, cuenta exclusivamente Memories reveladas y nunca disminuye.
- [x] La primera Memory presenta a Pom y las Memories 2, 7, 14 y 30 desbloquean los accesorios 1, 2, 3 y 4 respectivamente.
- [x] Question, Photo y Doodle revelados cuentan una vez; Threads, Important Dates, compras, aperturas, Contributions unilaterales y recuperación de Streak no cuentan.
- [x] Existe un vestuario sencillo con preview de Pom, opción `Sin accesorio`, cuatro accesorios y el milestone visible de cada elemento bloqueado.
- [x] Solo se equipa un accesorio a la vez; cualquiera de los dos miembros puede equiparlo o quitarlo y la última selección válida se sincroniza para la Pair.
- [x] Romper Streak o expirar Premium no elimina desbloqueos; una Pair activa en Archive Mode puede seguir viendo y seleccionando lo ya obtenido.
- [x] Home refleja el estado y accesorio actuales de Pom mediante el asset `Pom / Original` aprobado como referencia.
- [x] Cada accesorio se entrega como asset separado, con anchor estable, variantes claro/oscuro y legibilidad comprobada en Home, Reveal y widgets.
- [x] Los assets temporales pueden sustituirse por el arte final de la diseñadora sin cambiar el modelo de Progress ni rehacer las pantallas.
- [x] Inactividad, pérdida de Streak, Archive Mode o cierre del paywall nunca muestran hambre, enfermedad, muerte, tristeza o culpa.
- [x] No existen monedas, tienda, habitación, minijuegos, múltiples mascotas ni micropagos cosméticos.
- [x] Pruebas de comportamiento verifican idempotencia de Progress, desbloqueos, selección y ausencia de estados punitivos.

## Blocked by

- [04 - Question: primer Moment completo hasta Memory](04-question-hasta-memory.md)

## Comments

### 2026-08-16 - Vestuario y desbloqueos

- Se confirma un vestuario compartido, no una tienda.
- La opción `Sin accesorio` permite retirar cualquier accesorio equipado.
- Los cuatro accesorios se desbloquean en las Memories 2, 7, 14 y 30.
- La diseñadora propondrá conceptos visuales; el comportamiento no depende de cuáles sean los cuatro objetos finales.

### 2026-08-17 - Implementación verificada

- `e33b6dd` entrega Progress Pair-scoped, reacción de Reveal, seis expresiones, cuatro accesorios claro/oscuro y vestuario compartido.
- Reveal actualiza Progress de forma idempotente; Journal Entries, Threads y fechas no cuentan para Progress ni Streak.
- La suite SQL de Progress cubre idempotencia, hitos 2/7/14/30, RLS, Archive Mode y selección compartida; los tests de aplicación cubren el controller y las reacciones.
