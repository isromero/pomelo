# Localización ES/EN y temas claro/oscuro

Status: ready-for-agent

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

160-165.

## What to build

Completar la internacionalización y apariencia del MVP como comportamientos de producto, no como reservas para el futuro. Cada User puede usar español o inglés y elegir system, light o dark sin alterar a su pareja; una Pair multilingüe comparte el mismo Prompt semántico y todas las superficies existentes conservan contenido, accesibilidad, marca y privacidad.

## Acceptance criteria

- [x] El primer arranque elige español o inglés desde el dispositivo y el User puede cambiar Locale manualmente sin cambiar el de su pareja.
- [ ] Locale y Appearance se aplican antes de autenticación, se guardan en Profile al iniciar sesión y se restauran sin flashes del idioma o tema equivocado.
- [ ] No quedan strings User-facing hard-coded ni claves visibles en UI, onboarding, errores, estados vacíos, permisos o accesibilidad.
- [x] Una Pair con Locales distintos recibe el mismo identificador semántico de Prompt y cada miembro ve una traducción ES/EN equivalente.
- [ ] La biblioteca impide activar un Prompt sin ambas variantes completas y conserva formato, respuesta esperada e intimidad comunes.
- [ ] Fechas, horas, plurales, números, distancia, precios y renovación usan reglas del Locale del User sin cambiar importes o estado compartido.
- [ ] Notificaciones, deep links, widgets, paywall, restore, términos, privacidad, soporte y metadata de tiendas están completos en ES/EN.
- [ ] El User puede elegir `System`, `Light` o `Dark`; cambiarlo actualiza la app y persiste después de reiniciar.
- [ ] Todos los componentes consumen tokens semánticos con variantes clara y oscura, sin colores de negocio hard-coded por pantalla.
- [ ] Home, Moment, Reveal, History, Map, Photo, Doodle, Pom, Pair space, ajustes y paywall conservan contraste, jerarquía y legibilidad en ambos temas.
- [ ] Widgets iOS y Android usan strings localizados y una presentación legible en la apariencia del sistema sin mostrar contenido oculto durante cambios de tema.
- [ ] Pom, avatares, Photo, Doodle, mapas y estados de eliminación mantienen bordes o fondos suficientes en claro y oscuro.
- [ ] Tests detectan claves ausentes, traducciones incompletas, interpolaciones inválidas y valores de token sin variante oscura.
- [ ] Una matriz visual revisa ES/EN x light/dark, textos largos, escalado de texto, reduce motion y contraste en todas las rutas críticas.

## Blocked by

- [01 - Runtime nativo y baseline de Supabase verificable](01-runtime-nativo-y-baseline-supabase.md)
- [05 - Premium después del primer Reveal](05-premium-tras-primer-reveal.md)
- [11 - History completa, control de Contributions y Map](11-history-privacidad-y-map.md)
- [12 - Important Dates y Pair space](12-important-dates-y-pair-space.md)
- [13 - Horario, notificaciones y deep links](13-horario-notificaciones-y-deep-links.md)
- [14 - Widget Family en iOS](14-widget-family-ios.md)
- [15 - Widget Family equivalente en Android](15-widget-family-android.md)
- [16 - Biblioteca de Prompts operable](16-biblioteca-de-prompts.md)
- [18 - Onboarding de valor basado en el producto real](18-onboarding-de-valor.md)
- [19 - Ajustes, privacidad y flujos destructivos completos](19-ajustes-privacidad-y-eliminacion.md)

## Comments
