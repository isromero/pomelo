# Provisioning y verificacion de autenticacion social

Status: ready-for-human

## Parent

[PRD: Pomelo MVP](../PRD.md)

## User stories

9-12.

## What to build

Completar el provisioning externo y verificar de extremo a extremo la autenticacion nativa ya implementada. Apple debe funcionar con un App ID definitivo en iOS y Google con Credential Manager en Android, ambos intercambiando un ID token con Supabase sin exponer secretos en el cliente.

## Acceptance criteria

- [ ] iOS y Android usan identificadores definitivos, estables y registrados en sus respectivas consolas.
- [ ] El App ID de iOS tiene Sign in with Apple habilitado y la build contiene el entitlement y provisioning profile correctos.
- [ ] El provider Apple acepta el App ID nativo en Supabase local y en el proyecto alojado correspondiente.
- [ ] Sign in with Apple completa alta, login, cancelacion y recuperacion del mismo Profile en un iPhone fisico.
- [ ] Google Auth Platform tiene branding, audience y test users definidos para Pomelo.
- [ ] Existen clientes OAuth Web y Android; el cliente Android coincide con package y SHA-1 de cada certificado usado.
- [ ] El provider Google usa el Web client ID y su secret en Supabase local y alojado, con verificacion de nonce activa.
- [ ] Google Credential Manager completa alta, login, cancelacion y recuperacion del mismo Profile en un dispositivo o emulador Android con Google Play Services.
- [ ] Ningun client secret, service-role key, `.p8` ni otra credencial privada se incluye en `EXPO_PUBLIC_*`, Git o el bundle de la app.
- [ ] Cada boton social solo se habilita mediante su flag publica despues de superar la verificacion end-to-end.
- [ ] Las pruebas sociales no crean sesiones parciales ni Profiles duplicados al cancelar, reintentar o cambiar de dispositivo.
- [ ] README documenta configuracion, rotacion aplicable, reconstruccion nativa y diagnostico basico para ambos providers.

## Blocked by

- [02 - Cuenta, Profile y recuperacion de sesion](02-cuenta-profile-y-sesion.md)

## Comments

- Requiere acceso humano a Apple Developer, Google Cloud y al proyecto alojado de Supabase. El agente puede preparar y verificar la configuracion del repositorio sin recibir secretos por chat.
