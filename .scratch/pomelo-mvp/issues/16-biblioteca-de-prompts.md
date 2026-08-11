# Biblioteca de Prompts operable

Status: ready-for-agent

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

40, 146-149 y 155.

## What to build

Reemplazar el Prompt único de desarrollo por una biblioteca Spanish-first con localización inglesa completa y operable sin publicar una nueva versión. El selector diario debe respetar concepto semántico, formato, respuesta esperada, Locale, intimidad, estado activo y repetición reciente para Question, Photo y Doodle.

## Acceptance criteria

- [ ] La biblioteca inicial contiene aproximadamente 40-50 Questions, 25-30 Photo Prompts y 25-30 Doodle Prompts, cada uno revisado en español e inglés.
- [ ] Cada Prompt registra un concepto estable, variantes ES/EN, formato, nivel de intimidad, estado activo y forma de respuesta cuando corresponda.
- [ ] Question diferencia texto corto y elección única A/B/C sin inferir el tipo desde el copy.
- [ ] La generación diaria selecciona un concepto compatible con formato y estado de la Pair; cada miembro recibe la variante de su propio Locale.
- [ ] No se puede activar un Prompt si falta una traducción, las variantes cambian la semántica o difieren en tipo de respuesta.
- [ ] Una Pair no recibe inmediatamente un Prompt ya utilizado y la estrategia de repetición tiene comportamiento determinista y testeable.
- [ ] El primer Moment gratuito sigue usando su Prompt diseñado y no participa en selección aleatoria.
- [ ] Un responsable puede desactivar un Prompt problemático mediante una operación segura sin publicar una nueva versión ni construir un CMS completo.
- [ ] Reportar un Prompt proporciona su identificador y contexto operativo, nunca las Contributions privadas.
- [ ] El contenido en español e inglés pasa una revisión humana de naturalidad, equivalencia, inclusividad y nivel de intimidad.
- [ ] Seeds, validación y pruebas impiden formatos desconocidos, contenido activo incompleto y selección de Prompts desactivados.

## Blocked by

- [04 - Question: primer Moment completo hasta Memory](04-question-hasta-memory.md)
- [08 - Photo Moment con doble cámara estilo BeReal](08-photo-doble-camara.md)
- [09 - Doodle Moment colaborativo en tiempo real](09-doodle-colaborativo.md)

## Comments
