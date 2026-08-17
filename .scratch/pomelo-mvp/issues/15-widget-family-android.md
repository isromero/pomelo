# Widget Family equivalente en Android

Status: ready-for-agent

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

113-120 y 122.

## What to build

Entregar en Android las mismas finalidades de Widget Family validadas para el producto: estado, última Memory, distancia e Important Date, usando la vía nativa probada en el baseline. La presentación puede adaptarse a restricciones de Android, pero privacidad, contenido y destinos deben ser equivalentes a iOS.

## Acceptance criteria

- [ ] El widget de estado refleja Pom, Streak y los cuatro estados del Moment con datos reales.
- [ ] Tocar cualquier modo abre el destino correcto mediante deep link después de arranque en frío o sesión restaurada.
- [ ] El widget de Memory solo muestra Photo o Doodle revelados y usa opt-in explícito para contenido visual.
- [ ] Photo conserva la jerarquía pareja principal y propia miniatura siempre que el tamaño del launcher lo permita sin perder legibilidad.
- [ ] El User puede ocultar inmediatamente contenido visual y el widget muestra un estado neutro.
- [ ] Distancia usa ciudades manuales, representa `Juntos` cuando corresponda y no solicita background GPS.
- [ ] La próxima fecha refleja la Journal Entry, cumpleaños o aniversario elegible más cercano y responde a cambios, ocultación y zona horaria.
- [ ] Los tamaños y estados vacíos siguen convenciones Android sin reducir las garantías de privacidad.
- [ ] Todos los textos y fechas respetan el Locale del User y cada modo conserva legibilidad en apariencias clara y oscura del launcher.
- [ ] Logout, unlinking, eliminación, retirada de ubicación y expiry limpian o neutralizan RemoteViews y archivos derivados.
- [ ] La actualización respeta límites de plataforma y no depende de polling agresivo o trabajo en background no permitido.
- [ ] Pruebas en al menos dos versiones y launchers Android verifican refresh, deep links, resize, opt-in, Reveal y revocación.

## Blocked by

- [01 - Runtime nativo y baseline de Supabase verificable](01-runtime-nativo-y-baseline-supabase.md)
- [08 - Photo Moment con doble cámara estilo BeReal](08-photo-doble-camara.md)
- [09 - Doodle Moment colaborativo en tiempo real](09-doodle-colaborativo.md)
- [10 - Pom, Progress y accesorios](10-pom-progress-y-accesorios.md)
- [11 - History completa, control de Contributions y Map](11-history-privacidad-y-map.md)
- [12 - Important Dates y Pair space](12-important-dates-y-pair-space.md)
- [13 - Horario, notificaciones y deep links](13-horario-notificaciones-y-deep-links.md)

## Comments

### 2026-08-17 - Contrato de próxima fecha preparado

- El contrato compartido de Diary selecciona la próxima Journal Entry, cumpleaños o aniversario elegible y mantiene la privacidad de entradas ocultas.
- El deep link de entrada ya está definido para que el widget Android abra Diary en el elemento correcto cuando se implemente el refresh nativo.
- La Widget Family Android completa, RemoteViews dinámicas, refresh nativo, opt-in de media y QA con launchers siguen pendientes de este issue.
