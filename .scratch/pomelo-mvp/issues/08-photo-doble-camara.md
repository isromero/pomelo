# Photo Moment con doble cámara estilo BeReal

Status: ready-for-human

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

61-67 y 138.

## What to build

Añadir Photo como segundo formato completo del lifecycle. Cada miembro aporta una captura trasera y otra frontal de forma secuencial, puede corregirlas antes de enviar y no ve las imágenes de la pareja hasta Reveal. El resultado genera una composición privada estilo BeReal apta para Memory y widgets.

## Acceptance criteria

- [x] Un Photo Moment entrega el mismo Prompt fotográfico a ambos miembros.
- [x] Cada User puede completar captura trasera y frontal secuenciales y sabe claramente cuál falta.
- [x] Cámara y galería se solicitan solo al usarlas y los estados denegado, limitado o revocado son recuperables.
- [x] Cada captura puede repetirse o sustituirse desde galería antes del envío y queda cerrada después de confirmar.
- [x] Las cuatro imágenes fuente de una Pair completada se guardan en Storage privado sin URLs públicas permanentes.
- [x] Las políticas de Storage impiden que la pareja acceda a las imágenes ajenas antes de Reveal.
- [x] Subidas interrumpidas pueden reanudarse o reintentarse sin crear una Contribution parcial visible.
- [x] El Moment solo queda ready cuando ambos miembros han enviado las dos imágenes requeridas.
- [x] Reveal muestra las dos Contributions en composiciones consistentes y crea exactamente una Photo Memory.
- [x] La composición derivada permite mostrar la foto de la pareja como principal y la propia como miniatura en la futura superficie de widget.
- [x] El User puede impedir que esa Memory sea elegible para widget visual.
- [x] Pruebas de aplicación y base de datos cubren cámara/galería como acciones contextuales, permisos, subida privada, Reveal, reintentos y limpieza de media temporal.

## Blocked by

- [04 - Question: primer Moment completo hasta Memory](04-question-hasta-memory.md)

## Comments

### 2026-08-17 - Implementación verificada

- `19a629b` entrega el flujo Photo, borradores locales, captura trasera/frontal, galería, composición, Storage privado y Reveal idempotente.
- Las pruebas de controller y `photo_doodle_thread.test.sql` cubren lifecycle, privacidad pre-Reveal, reintentos, composición, widget opt-in y RLS.
- La validación manual en dispositivos físicos queda como QA de lanzamiento, no como trabajo pendiente del slice funcional.
