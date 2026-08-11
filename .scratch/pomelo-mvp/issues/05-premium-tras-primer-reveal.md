# Premium después del primer Reveal

Status: ready-for-agent

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

123-136 y 157-158.

## What to build

Convertir el primer Reveal gratuito en el punto de monetización real. La Pair debe ver primero su resultado y previews simuladas de Map y Widget Family; después, un Subscriber puede comprar o restaurar Premium mediante RevenueCat y ambos miembros reciben acceso. Cerrar, cancelar, caducar o desvincular debe producir el Archive Mode acordado sin perder la primera Memory.

## Acceptance criteria

- [ ] Crear cuenta, formar Pair y completar el primer Reveal no solicita tarjeta ni requiere Premium.
- [ ] Después de la primera Memory se muestran previews simuladas dentro de la app para Map y Widget Family, no acceso funcional gratuito.
- [ ] El resultado del Reveal permanece visible antes de presentar el paywall y cerrar el paywall es una acción clara.
- [ ] El paywall comunica `Una suscripción para los dos` y usa `Desbloquear Pomelo para los dos` como CTA principal.
- [ ] Se ofrecen EUR 29.99 anual y EUR 7.99 mensual; el anual está recomendado y el importe real, renovación y cancelación son visibles.
- [ ] No existe trial, producto semanal ni counter-offer; cualquier equivalente semanal se presenta solo como contexto secundario.
- [ ] El paywall incluye restore, términos de uso y privacidad.
- [ ] Copy, precios, renovación, restore, términos y errores del paywall tienen variantes completas ES/EN y mantienen jerarquía y contraste en claro y oscuro.
- [ ] Una compra sandbox válida convierte al comprador en Subscriber y proyecta Premium sobre la Pair activa mediante un webhook idempotente.
- [ ] El segundo miembro recibe Premium sin comprar y se impide una compra duplicada mientras la Pair ya tiene acceso.
- [ ] Restaurar en otro dispositivo recupera la propiedad y la proyección correctas.
- [ ] Cancelar conserva acceso hasta el final del periodo pagado; grace period y expiry se reflejan sin borrar Memories.
- [ ] Cerrar el paywall o expirar deja Pom y la primera Memory visibles en Archive Mode y bloquea la generación del siguiente Moment.
- [ ] Al desvincular, Premium sigue al Subscriber y la antigua Pair queda archivada.
- [ ] Webhooks duplicados, retrasados o fuera de orden no duplican ni revocan incorrectamente el entitlement.

## Blocked by

- [04 - Question: primer Moment completo hasta Memory](04-question-hasta-memory.md)

## Comments
