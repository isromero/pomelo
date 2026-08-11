# Runtime nativo y baseline de Supabase verificable

Status: ready-for-agent

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

12, 38, 39, 154 y 156.

## What to build

Establecer el primer recorrido real de la aplicación: development builds reproducibles en iOS y Android que arrancan, cargan la configuración del entorno de desarrollo, atraviesan límites de servicio definidos y verifican una sesión contra Supabase sin depender de mocked data. El slice debe dejar preparado un flujo repetible de migraciones, seed y tipos, una política RLS cerrada por defecto, los providers base de Locale y Appearance y una prueba nativa mínima de la estrategia de widgets en ambas plataformas.

## Acceptance criteria

- [ ] Un desarrollador puede preparar el proyecto desde un checkout limpio siguiendo instrucciones versionadas y producir development builds instalables en iOS y Android.
- [ ] La configuración pública de Supabase se valida al arrancar y ningún secreto de servidor se incluye en el cliente.
- [ ] Una base de datos vacía puede reconstruirse de forma determinista mediante migraciones y datos seed mínimos.
- [ ] Los tipos consumidos por el cliente se generan o validan a partir del schema de Supabase sin mantener una copia manual divergente.
- [ ] Una pantalla o prueba de integración demuestra una sesión Auth real y una lectura autorizada a través de un servicio/repositorio, no desde el componente visual.
- [ ] El acceso anónimo o cruzado a datos protegidos falla por defecto mediante RLS.
- [ ] Los límites de servicio permiten ejecutar la UI con un doble determinista en tests y con Supabase en desarrollo.
- [ ] La raíz de la aplicación instala un provider de Locale con catálogos ES/EN y un provider de Appearance basado en tokens semánticos light/dark, demostrados en una superficie mínima.
- [ ] El arranque puede seguir el idioma y apariencia del sistema sin impedir overrides persistentes posteriores.
- [ ] Existe una prueba de humo automatizada que detecta configuración inválida, migraciones rotas o pérdida de conectividad con el backend.
- [ ] Una superficie nativa mínima de widget puede instalarse y abrir la app mediante deep link tanto en iOS como en Android, validando la vía técnica elegida antes de construir Widget Family.
- [ ] Los fallos de arranque, red y sesión se muestran de forma recuperable y generan diagnóstico sin incluir datos privados.

## Blocked by

None - can start immediately.

## Comments
