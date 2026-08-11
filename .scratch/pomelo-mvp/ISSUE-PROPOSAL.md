# Propuesta de slices verticales para Pomelo MVP

Status: ready-for-agent

Approved: 2026-08-11

Desglose aprobado para publicar como issues individuales.

Cada slice debe entregar un recorrido verificable de extremo a extremo. Los números de User Stories apuntan a `PRD.md`.

## 1. Runtime nativo y baseline de Supabase verificable

- **Blocked by:** ninguno.
- **User Stories covered:** 12, 38, 39, 154, 156.
- **Resultado demostrable:** development builds reproducibles en iOS y Android conectan con el entorno real de desarrollo de Supabase mediante configuración validada. Quedan operativos el flujo de migraciones y seed, el cliente tipado, una sesión Auth de prueba, RLS fail-closed, los límites de servicio/repositorio y una prueba de integración que demuestra que la app ya no depende de mocked data. Incluye una prueba nativa temprana para confirmar la estrategia de widgets en ambas plataformas.

## 2. Cuenta, Profile y recuperación de sesión

- **Blocked by:** 1.
- **User Stories covered:** 4-15.
- **Resultado demostrable:** una persona crea o recupera una cuenta, completa nombre, avatar generado y birth date mediante el selector nativo, cierra y vuelve a abrir la app conservando la sesión.

## 3. Pair e Invitation mediante enlace o código

- **Blocked by:** 2.
- **User Stories covered:** 16-30.
- **Resultado demostrable:** un User crea una Pair, comparte Invitation, el segundo User completa sus datos personales y se vincula mediante enlace o código; ambos ven el mismo estado activo y se cubren cancelación, caducidad y espera.

## 4. Question: primer Moment completo hasta Memory

- **Blocked by:** 3.
- **User Stories covered:** 31-51, 56-59, 76-79.
- **Resultado demostrable:** dos dispositivos reciben el mismo Question Moment, envían Contributions que no pueden leerse antes de Reveal, llegan a ready, cualquiera revela y se crea exactamente una Memory visible en una History mínima.

## 5. Premium después del primer Reveal

- **Blocked by:** 4.
- **User Stories covered:** 123-136, 157-158.
- **Resultado demostrable:** la primera experiencia completa es gratuita y enseña las previews simuladas de Map y Widget Family; después aparece el paywall real, un Subscriber compra o restaura y ambos miembros reciben Premium. Cerrar, caducar o desvincular produce el Archive Mode acordado sin borrar la primera Memory.

## 6. Lifecycle resistente, recuperación y Streak

- **Blocked by:** 4.
- **User Stories covered:** 38-39, 52-54, 105-107.
- **Resultado demostrable:** el Question Moment tolera reintentos y reconexión, pasa por ventana normal, recuperación y caducidad sin revelar contenido unilateral, y actualiza el Streak compartido de forma idempotente.

## 7. Thread de conversación dentro de una Memory

- **Blocked by:** 4.
- **User Stories covered:** 60, 80-82.
- **Resultado demostrable:** después de Reveal ambos miembros intercambian mensajes de texto dentro de la Memory concreta y no existe un chat general fuera de ella.

## 8. Photo Moment con doble cámara estilo BeReal

- **Blocked by:** 4.
- **User Stories covered:** 61-67, 138.
- **Resultado demostrable:** cada miembro captura o selecciona su parte trasera y frontal, puede repetir antes de enviar, las cuatro imágenes permanecen privadas hasta Reveal y la composición final se guarda como Memory.

## 9. Doodle Moment colaborativo en tiempo real

- **Blocked by:** 4.
- **User Stories covered:** 68-75.
- **Resultado demostrable:** dos miembros dibujan simultáneamente en el mismo lienzo con las herramientas MVP, sobreviven a una reconexión, finalizan el ritual y generan una Memory estable mediante Reveal.

## 10. Pom, Progress y accesorios

- **Blocked by:** 4.
- **User Stories covered:** 55, 91-96.
- **Resultado demostrable:** Reveal hace reaccionar a Pom, una Memory incrementa Progress, se desbloquea y selecciona un accesorio y la inactividad no genera ningún estado punitivo.

## 11. History completa, control de Contributions y Map

- **Blocked by:** 7, 8, 9.
- **User Stories covered:** 76-90, 137-145.
- **Resultado demostrable:** History combina los tres formatos, cada Memory abre su detalle y Thread, el User puede retirar ubicación u ocultar/eliminar su Contribution, y Map muestra solo Memories con ciudad aproximada.

## 12. Important Dates y Pair space

- **Blocked by:** 3.
- **User Stories covered:** 27, 108-112.
- **Resultado demostrable:** la Pair consulta cumpleaños y aniversario, crea una fecha de viaje o personalizada, la edita y ve la siguiente cuenta atrás en un Pair space sencillo.

## 13. Horario, notificaciones y deep links

- **Blocked by:** 6, 7.
- **User Stories covered:** 46, 53, 81, 97-104.
- **Resultado demostrable:** la Pair elige hora, ambos reciben las notificaciones correspondientes a su estado y cada toque abre exactamente el Moment o Thread correcto, incluyendo zonas horarias y preferencias de silencio.

## 14. Widget Family en iOS

- **Blocked by:** 8, 9, 10, 11, 12, 13.
- **User Stories covered:** 112-121.
- **Resultado demostrable:** widgets iOS de estado, última Memory, distancia aproximada e Important Date; respetan opt-in, Reveal, logout, ocultación y deep links.

## 15. Widget Family equivalente en Android

- **Blocked by:** 1, 8, 9, 10, 11, 12, 13.
- **User Stories covered:** 113-120, 122.
- **Resultado demostrable:** Android ofrece las mismas finalidades y garantías de privacidad mediante la superficie nativa validada en el slice 1, aunque su presentación respete restricciones de plataforma.

## 16. Biblioteca de Prompts operable

- **Blocked by:** 4, 8, 9.
- **User Stories covered:** 40, 146-149, 155.
- **Resultado demostrable:** la Pair recibe contenido Spanish-first de las tres bibliotecas sin repetición inmediata y un responsable puede activar o desactivar un Prompt problemático sin construir un CMS completo.

## 17. Analítica Pair-first y diagnóstico sin contenido privado

- **Blocked by:** 3, 4, 5, 6.
- **User Stories covered:** 151-155.
- **Resultado demostrable:** el equipo observa el embudo desde Invitation hasta séptima Memory y compra, distingue fallos operativos y comprueba que ningún evento contiene respuestas, media, trazos o mensajes.

## 18. Onboarding de valor basado en el producto real

- **Blocked by:** 4, 8, 9, 10, 11.
- **User Stories covered:** 1-8, 31-36.
- **Resultado demostrable:** la bienvenida representa con estados reales el ciclo Moment -> Reveal -> Memory -> Pom, conduce al onboarding personal y conserva un acceso claro a iniciar sesión y navegación hacia atrás.

## 19. Ajustes, privacidad y flujos destructivos completos

- **Blocked by:** 5, 11, 12, 13, 14, 15.
- **User Stories covered:** 13-15, 28-30, 83-87, 132-145.
- **Resultado demostrable:** el User gestiona Profile, Pair, Premium, permisos y soporte; logout, unlink, eliminación de Contribution, location y cuenta se propagan correctamente a History, Map, widgets, Storage y Archive Mode.

## 20. Localización ES/EN y temas claro/oscuro

- **Blocked by:** 1, 5, 11, 12, 13, 14, 15, 16, 18, 19.
- **User Stories covered:** 160-165.
- **Resultado demostrable:** cada User puede usar toda la experiencia en español o inglés y elegir system, light o dark; una Pair con Locales distintos recibe el mismo Prompt semántico, y app, notificaciones, widgets, paywall, contenido y superficies nativas permanecen completos, legibles y privados.

## 21. Hardening y candidata de lanzamiento

- **Blocked by:** 5-20.
- **User Stories covered:** 150, 154, 156, 159 y regresión del resto.
- **Resultado demostrable:** dos personas completan el recorrido crítico en combinaciones iOS-iOS, Android-Android e iOS-Android; se verifican accesibilidad, permisos, offline/retry, privacidad, compras, deep links, widgets y requisitos de distribución hasta producir una candidata de lanzamiento.

## Paralelización prevista

- Tras el slice 1, puede empezar 2 y quedan despejados el baseline de Supabase y el riesgo nativo.
- Tras el slice 4, pueden avanzar en paralelo 5, 6, 7, 8, 9, 10, 16 y parte de 17.
- El slice 12 puede avanzar desde que exista Pair, sin esperar a los formatos de Moment.
- Los widgets iOS y Android pueden avanzar en paralelo cuando existan sus fuentes de datos reales, apoyándose en la prueba de integración nativa del slice 1.
- Los widgets y los flujos destructivos se construyen cuando sus fuentes de datos reales existen, evitando mocks que luego haya que reemplazar.
- El onboarding de marketing se deja deliberadamente después del núcleo para grabar o animar el producto real, como se decidió.
- La infraestructura de Locale y Appearance empieza en el slice 1 y cada feature evita hard-coding; el slice 20 completa y verifica la experiencia transversal antes de hardening.
