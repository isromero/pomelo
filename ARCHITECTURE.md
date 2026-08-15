# Application Architecture

Pomelo uses a feature-based architecture with lightweight layers inspired by Clean Architecture and Ports and Adapters. This is a repository convention, not an Expo requirement and not a mandate to implement full tactical DDD.

The goals are to keep code that changes together close, protect domain behavior from framework and backend details, and preserve test seams around external services.

## Top-level placement

```text
src/
|-- app/                  Expo Router routes and composition
|-- features/             Product capabilities
|   `-- account/
|       |-- domain/
|       |-- application/
|       |-- infrastructure/
|       `-- presentation/
|-- components/           UI shared by multiple features
|-- constants/            Truly global constants and design tokens
`-- lib/                  Cross-feature SDK clients and platform setup
```

- `src/app` stays thin. Routes select and compose feature screens; they do not contain business rules or direct database calls.
- `src/features/<feature>` owns the UI, behavior, service boundaries, and tests for one product capability.
- `src/components` is only for UI with multiple real feature consumers. Do not move components there speculatively.
- `src/lib` configures shared external clients or platform facilities. It must not become a generic home for feature behavior.

## Optional feature layers

A feature may start flat. Add a layer only when it has a distinct responsibility and enough code to justify the directory.

### Domain

`domain` contains product concepts, invariants, value validation, and pure transformations.

- It must not import React, React Native, Expo, navigation, Supabase, or platform APIs.
- Prefer plain TypeScript types and pure functions.
- Use classes only when they protect meaningful state or invariants better than functions and types.

### Application

`application` coordinates use cases and state transitions such as restoring a session, completing a Profile, or revealing a Moment.

- It may depend on the feature's domain.
- It defines ports such as repositories or gateways when external behavior must be replaceable or testable.
- It must not depend on presentation components or concrete SDK implementations.

### Infrastructure

`infrastructure` implements application ports using Supabase, Expo modules, device storage, or other external systems.

- It translates SDK responses, persistence rows, and provider errors into feature-level types.
- It must not contain visual behavior.
- Server constraints and RLS remain authoritative for privacy and lifecycle invariants.

### Presentation

`presentation` contains React providers, hooks, screens, and feature-specific visual components.

- It renders application state and sends User actions to application use cases.
- It must not query Supabase or other backend SDKs directly.
- A provider or composition factory may connect application ports to infrastructure adapters at the feature boundary.

## Dependency direction

Dependencies point toward stable product behavior:

```text
presentation ------> application ------> domain
       |                   ^
       |                   |
       `-> composition <- infrastructure
```

In practical terms:

- `domain` depends on no other feature layer.
- `application` may import `domain`.
- `infrastructure` may import `application` contracts and `domain` types.
- `presentation` may import `application` and `domain`.
- Composition code is the explicit place where presentation and concrete infrastructure meet.

Avoid importing another feature's internal files. Prefer composing features in routes or exposing a small intentional feature API. Extract shared code only after multiple real consumers appear.

## Proportionality rules

Do not reproduce all four directories for every feature.

A small feature can remain flat:

```text
features/settings/
|-- settings-screen.tsx
`-- settings.ts
```

A feature earns additional layers when it has one or more of these needs:

- Product invariants that should be testable without React.
- Several asynchronous states or coordinated use cases.
- External SDKs, persistence, or platform-specific implementations.
- Deterministic doubles for behavior tests.
- Privacy or authorization boundaries that must remain visible.

Avoid one-class-per-action, empty layers, pass-through wrappers, speculative abstractions, and DTO/entity/mapper duplication without a concrete boundary. Functions and plain objects are the default; a class is appropriate when it owns lifecycle, mutable state, subscriptions, or a protected invariant.

## Testing

- Test domain rules as pure TypeScript.
- Test application behavior against deterministic port doubles.
- Test infrastructure where translation or platform behavior carries risk.
- Test database constraints and RLS under `supabase/tests`.
- Keep UI tests focused on User-visible behavior rather than implementation structure.

Architecture supports the product; it is not the product. When a simpler structure preserves the same boundaries and clarity, prefer the simpler structure.
