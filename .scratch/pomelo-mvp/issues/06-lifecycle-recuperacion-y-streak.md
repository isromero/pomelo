# Lifecycle resistente, recuperación y Streak

Status: ready-for-agent

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

38-39, 52-54 y 105-107.

## What to build

Endurecer el Question Moment ya funcional para que el ritual sobreviva a días ocupados, errores de red y reintentos sin comprometer privacidad. El lifecycle debe aplicar ventana normal, recuperación, caducidad y Streak compartido de forma autoritativa y comprensible para los dos miembros.

## Acceptance criteria

- [ ] Cada Moment tiene una ventana normal de 24 horas y una recuperación adicional de 24 horas calculadas con reglas Pair-scoped explícitas.
- [ ] Home muestra tiempo restante y distingue claramente ventana normal, recuperación y expiración.
- [ ] Una Contribution pendiente puede reintentarse después de perder conexión sin duplicarse ni cambiar la enviada previamente.
- [ ] El trabajo todavía no enviado se conserva de forma segura en el dispositivo y comunica cuándo falta sincronizar.
- [ ] Un Moment con una sola Contribution nunca revela esa aportación ni crea una Memory conjunta al expirar.
- [ ] Un Moment expirado deja un estado estable y no bloquea la generación válida del siguiente día.
- [ ] Streak aumenta una sola vez cuando ambos miembros completan el Moment dentro de la ventana permitida.
- [ ] Existe una recuperación gratuita limitada del Streak con reglas visibles y protegidas contra reintentos duplicados.
- [ ] Romper el Streak conserva el récord histórico, Memories y Progress y no genera un estado negativo de Pom.
- [ ] Pruebas con reloj controlado cubren cambio de día, recuperación, expiración, reintento, dos clientes concurrentes y zonas horarias distintas.

## Blocked by

- [04 - Question: primer Moment completo hasta Memory](04-question-hasta-memory.md)

## Comments

