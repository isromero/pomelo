# Premium después del primer Reveal

Status: ready-for-agent

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

123-136 y 157-158.

## What to build

Convertir el primer Reveal gratuito en el punto de monetización real. La pareja debe ver primero su resultado y, después, el paywall. Sin Premium, la app conserva ese primer resultado como el contenido normal de lo de hoy, permite consultarlo también en Historia y no ofrece nuevas propuestas ni respuestas. Map y Widget Family siguen protegidos hasta activar Premium; un Subscriber puede comprar o restaurar Premium mediante RevenueCat y ambos miembros reciben acceso.

## Acceptance criteria

- [ ] Crear cuenta, formar Pair y completar el primer Reveal no solicita tarjeta ni requiere Premium.
- [ ] Después del primer Reveal, el primer resultado sigue visible como la pantalla normal de lo de hoy y también aparece en Historia.
- [ ] Sin Premium no se muestra una nueva propuesta ni se puede enviar otra respuesta; Map y Widget Family permanecen protegidos.
- [ ] El resultado del Reveal permanece visible antes de presentar el paywall y cerrar el paywall es una acción clara.
- [ ] El paywall comunica `Una suscripción para los dos` y usa `Desbloquear Pomelo para los dos` como CTA principal.
- [ ] Se ofrecen EUR 29.99 anual y EUR 7.99 mensual; el anual está recomendado y el importe real, renovación y cancelación son visibles.
- [ ] No existe trial, producto semanal ni counter-offer; cualquier equivalente semanal se presenta solo como contexto secundario.
- [ ] El paywall incluye restore, términos de uso y privacidad.
- [ ] Copy, precios, renovación, restore, términos y errores del paywall tienen variantes completas ES/EN y mantienen jerarquía y contraste en claro y oscuro.
- [ ] Una compra sandbox válida convierte al comprador en Subscriber y proyecta Premium sobre la Pair activa mediante un webhook idempotente.
- [ ] El segundo miembro recibe Premium sin comprar y se impide una compra duplicada mientras la Pair ya tiene acceso.
- [ ] Restaurar en otro dispositivo recupera la propiedad y la proyección correctas.
- [ ] Cancelar conserva acceso hasta el final del periodo pagado; grace period y expiry se reflejan sin borrar recuerdos.
- [ ] Cerrar el paywall o expirar deja Pom y el primer recuerdo visibles en la pantalla normal, sin etiquetas técnicas como "Archive Mode" o "preview"; también bloquea la generación del siguiente momento.
- [ ] Al desvincular, Premium sigue al Subscriber y la antigua Pair queda archivada.
- [ ] Webhooks duplicados, retrasados o fuera de orden no duplican ni revocan incorrectamente el entitlement.

## Blocked by

- [04 - Question: primer Moment completo hasta Memory](04-question-hasta-memory.md)

## Comments
