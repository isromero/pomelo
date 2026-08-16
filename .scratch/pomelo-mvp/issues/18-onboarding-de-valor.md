# Onboarding de valor basado en el producto real

Status: ready-for-agent

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

1-8 y 31-36.

## What to build

Completar la experiencia de activación cuando ya existen superficies reales del producto. La bienvenida debe explicar visualmente el ciclo Moment -> Reveal -> Memory -> Pom, conducir al onboarding personal y permitir iniciar sesión o retroceder con claridad, reutilizando el design system y los estados definitivos en vez de mocked screens desconectadas.

## Acceptance criteria

- [x] La primera pantalla comunica en pocos segundos que Pomelo propone un pequeño momento diario y construye una historia compartida.
- [ ] Una demo cíclica aproximada de seis segundos muestra Prompt, participación de ambos, Reveal, reacción de Pom y entrada de la Memory en History.
- [ ] Copy y botones permanecen estables mientras se anima únicamente la zona de demostración.
- [ ] La demo usa componentes, composiciones y assets del producto real o representaciones exportables de ellos, no una experiencia visual contradictoria.
- [x] `Empezar` o el CTA final acordado inicia el alta y `Ya tengo una cuenta` se percibe inequívocamente como acción.
- [ ] Todas las pantallas posteriores permiten volver cuando la acción no es irreversible y conservan el progreso válido.
- [ ] El recorrido mantiene el orden acordado: bienvenida, datos personales, avatar con reroll, birth date, cuenta, Pair/Invitation y datos compartidos cuando correspondan.
- [ ] El segundo miembro recorre sus datos personales pero omite preguntas compartidas ya resueltas.
- [ ] Pom aparece como acompañante visual sin hablar mediante bocadillos y usa la referencia `Pom / Original`.
- [ ] Bricolage Grotesque, Manrope, colores, radios y espaciado proceden de tokens compartidos con variantes clara y oscura.
- [ ] La estructura no contiene copy hard-coded y soporta catálogos ES/EN y textos ingleses más largos sin romper composición o navegación.
- [ ] La experiencia funciona con escalado de texto, lector de pantalla y reduce motion sin ocultar la explicación central.
- [ ] Pruebas de navegación cubren alta nueva, login existente, deep link de Invitation, retroceso, cierre y reanudación.

## Blocked by

- [04 - Question: primer Moment completo hasta Memory](04-question-hasta-memory.md)
- [08 - Photo Moment con doble cámara estilo BeReal](08-photo-doble-camara.md)
- [09 - Doodle Moment colaborativo en tiempo real](09-doodle-colaborativo.md)
- [10 - Pom, Progress y accesorios](10-pom-progress-y-accesorios.md)
- [11 - History completa, control de Contributions y Map](11-history-privacidad-y-map.md)

## Comments
