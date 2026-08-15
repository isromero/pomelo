# Cuenta, Profile y recuperación de sesión

Status: ready-for-agent

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

4-15.

## What to build

Permitir que una persona cree o recupere su User, complete el Profile personal requerido y vuelva a la aplicación conservando una sesión segura. El recorrido incluye nombre, avatar inicial con reroll, birth date mediante controles nativos y los estados necesarios para continuar hacia Pair sin mezclar todavía datos compartidos.

## Acceptance criteria

- [ ] Un User puede crear una cuenta e iniciar sesión mediante correo electrónico y el método de plataforma comprometido para el lanzamiento.
- [ ] En iOS se ofrece Sign in with Apple cuando corresponda y los errores o cancelaciones no dejan una sesión parcial.
- [ ] En Android se ofrece el flujo nativo de Google con nonce y los errores o cancelaciones no dejan una sesión parcial.
- [x] La bienvenida mantiene una opción inequívoca para iniciar sesión sin repetir el alta.
- [x] El Profile exige nombre visible, avatar y birth date completa, incluido el año.
- [x] Profile puede persistir Locale y Appearance por User con valores válidos y RLS de propietario, aunque su aplicación completa se cierre en el issue 20.
- [x] Birth date usa el selector nativo correspondiente en iOS y Android y rechaza fechas inválidas.
- [x] El sistema propone un avatar inicial y permite generar otro con una sola acción, sin obligar a elegir en una cuadrícula.
- [x] Un User solo puede leer y modificar su propio Profile mediante RLS.
- [x] La sesión se restaura después de cerrar y abrir la app y el estado incompleto del onboarding continúa desde el punto correcto.
- [x] El User puede cerrar sesión sin borrar su cuenta y todos los datos privados desaparecen de la UI y cachés del dispositivo.
- [x] La misma cuenta recupera su Profile en otro dispositivo sin crear duplicados.
- [x] Existen pruebas de comportamiento para alta, login, sesión expirada, recuperación, logout y acceso cruzado denegado.

## Blocked by

- [01 - Runtime nativo y baseline de Supabase verificable](01-runtime-nativo-y-baseline-supabase.md)

## Comments

- Implementado con Auth/Profile detrás de servicios, migración reproducible, RLS de propietario, pruebas de comportamiento y QA de bundles iOS/Android/web.
- El cliente de Apple/Google y el manejo seguro de cancelaciones están implementados, pero el provisioning externo y la prueba end-to-end se difieren a [22 - Provisioning y verificacion de autenticacion social](22-provisioning-auth-social.md). Los botones permanecen ocultos hasta que cada provider se habilite explicitamente.
