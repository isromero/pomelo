# Photo Moment con doble cámara estilo BeReal

Status: ready-for-agent

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

61-67 y 138.

## What to build

Añadir Photo como segundo formato completo del lifecycle. Cada miembro aporta una captura trasera y otra frontal de forma secuencial, puede corregirlas antes de enviar y no ve las imágenes de la pareja hasta Reveal. El resultado genera una composición privada estilo BeReal apta para Memory y widgets.

## Acceptance criteria

- [ ] Un Photo Moment entrega el mismo Prompt fotográfico a ambos miembros.
- [ ] Cada User puede completar captura trasera y frontal secuenciales y sabe claramente cuál falta.
- [ ] Cámara y galería se solicitan solo al usarlas y los estados denegado, limitado o revocado son recuperables.
- [ ] Cada captura puede repetirse o sustituirse desde galería antes del envío y queda cerrada después de confirmar.
- [ ] Las cuatro imágenes fuente de una Pair completada se guardan en Storage privado sin URLs públicas permanentes.
- [ ] Las políticas de Storage impiden que la pareja acceda a las imágenes ajenas antes de Reveal.
- [ ] Subidas interrumpidas pueden reanudarse o reintentarse sin crear una Contribution parcial visible.
- [ ] El Moment solo queda ready cuando ambos miembros han enviado las dos imágenes requeridas.
- [ ] Reveal muestra las dos Contributions en composiciones consistentes y crea exactamente una Photo Memory.
- [ ] La composición derivada permite mostrar la foto de la pareja como principal y la propia como miniatura en la futura superficie de widget.
- [ ] El User puede impedir que esa Memory sea elegible para widget visual.
- [ ] Pruebas de dispositivo cubren cámara frontal/trasera, galería, permisos, subida privada, Reveal y limpieza de media temporal.

## Blocked by

- [04 - Question: primer Moment completo hasta Memory](04-question-hasta-memory.md)

## Comments

