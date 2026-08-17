# Hardening y candidata de lanzamiento

Status: ready-for-agent

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

150, 154, 156, 159 y regresión del resto.

## What to build

Convertir el conjunto de slices en una candidata publicable y demostrable. Verificar el recorrido completo entre plataformas, accesibilidad, privacidad, fiabilidad, compras y requisitos de distribución; resolver bloqueos de severidad de lanzamiento y preparar una demostración del ciclo real para Shipaton sin sustituir comportamiento por mocked data.

## Acceptance criteria

- [ ] Dos personas completan onboarding, Pair, Question, Photo, Doodle, Reveal, Memory, Thread, History, Map, Pom, Important Dates y Premium en combinaciones iOS-iOS, Android-Android e iOS-Android.
- [ ] La matriz mínima cubre una versión reciente y una anterior de iOS y Android, tamaños de dispositivo distintos y al menos dos launchers Android para widgets.
- [ ] Los recorridos críticos funcionan con red lenta, pérdida temporal de conexión, reintentos, permisos denegados y sesión expirada sin pérdida o filtración de datos.
- [ ] RLS, Storage y URLs temporales superan una revisión de acceso con miembros, terceros, pre-Reveal, post-unlink y post-delete.
- [ ] Compras sandbox cubren mensual, anual, restore, partner access, doble intento, grace period, cancelación, expiry y cambio de Pair.
- [ ] Notificaciones, deep links y los cuatro modos de Widget Family se verifican en dispositivos reales de ambas plataformas.
- [ ] Los flujos críticos cumplen etiquetas, foco, contraste, tamaños de toque, escalado de texto, lector de pantalla y reduce motion.
- [ ] Los recorridos críticos pasan en español e inglés, incluida una Pair con Locales distintos, sin claves, fallback o contenido sin traducir.
- [ ] Los recorridos y widgets críticos pasan en system, light y dark sin flashes, contraste insuficiente o exposición de contenido.
- [ ] No quedan crashes, pérdidas de datos, filtraciones de privacidad ni bloqueos P0/P1 conocidos; los riesgos aceptados quedan documentados explícitamente.
- [ ] Configuración de producción, secretos, entornos, observabilidad y procedimientos de rollback están separados del desarrollo y documentados.
- [ ] Metadata, iconos finales aprobados, screenshots, privacidad, términos, soporte y disclosures de suscripción están listos para App Store y Google Play.
- [ ] Se genera una build candidata distribuible y se completa el checklist de envío o publicación de ambas tiendas.
- [ ] La presentación de Shipaton puede demostrar con dos cuentas reales el ciclo Moment -> Reveal -> Memory -> Pom y explica el producto aunque sea Spanish-first.
- [ ] La auditoría final enlaza cada una de las 165 User Stories con evidencia de issue, prueba o decisión explícita de fuera de scope.

## Blocked by

- [05 - Premium después del primer Reveal](05-premium-tras-primer-reveal.md)
- [06 - Lifecycle resistente, recuperación y Streak](06-lifecycle-recuperacion-y-streak.md)
- [07 - Thread de conversación dentro de una Memory](07-thread-de-memory.md)
- [08 - Photo Moment con doble cámara estilo BeReal](08-photo-doble-camara.md)
- [09 - Doodle Moment colaborativo en tiempo real](09-doodle-colaborativo.md)
- [10 - Pom, Progress y accesorios](10-pom-progress-y-accesorios.md)
- [11 - History completa, control de Contributions y Map](11-history-privacidad-y-map.md)
- [12 - Important Dates y Pair space](12-important-dates-y-pair-space.md)
- [13 - Horario, notificaciones y deep links](13-horario-notificaciones-y-deep-links.md)
- [14 - Widget Family en iOS](14-widget-family-ios.md)
- [15 - Widget Family equivalente en Android](15-widget-family-android.md)
- [16 - Biblioteca de Prompts operable](16-biblioteca-de-prompts.md)
- [17 - Analítica Pair-first y diagnóstico sin contenido privado](17-analitica-pair-first.md)
- [18 - Onboarding de valor basado en el producto real](18-onboarding-de-valor.md)
- [19 - Ajustes, privacidad y flujos destructivos completos](19-ajustes-privacidad-y-eliminacion.md)
- [20 - Localización ES/EN y temas claro/oscuro](20-localizacion-y-temas.md)
- [22 - Provisioning y verificacion de autenticacion social](22-provisioning-auth-social.md)

## Comments

### 2026-08-17 - Estado tras Diary unificado

- La rama contiene los slices funcionales de Pom/Progress, Photo, Doodle, Threads y Diary unificado con Calendar, Map, media privada, RLS y proyección de widget.
- Verificación automatizada actual: 25 suites y 111 tests Jest, 10 ficheros SQL con 242 aserciones pgTAP, typecheck, lint, smoke y exports Expo para web/iOS/Android; iOS nativo compila en simulator.
- QA adicional: el acceso inicial del Diario para una Pair sin entradas devuelve booleanos válidos y no muestra falsamente el bloqueo Premium; el test aislado de Diary pasa con 37 aserciones.
- Siguen fuera de esta implementación la programación de notificaciones, la Widget Family completa iOS/Android, provisioning social externo y la matriz final de dispositivos, accesibilidad, compras y publicación.
