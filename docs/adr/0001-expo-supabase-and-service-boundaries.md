# ADR-0001: Expo, Supabase, and service boundaries

## Status

Accepted

## Context

Pomelo must ship on iOS and Android quickly, support two-user real-time behavior, private media, subscriptions, notifications, widgets, and account recovery. The current client is an Expo SDK 57 React Native application.

## Decision

- Build the mobile client with Expo SDK 57, React Native, TypeScript, and Expo Router.
- Use development builds once native modules such as purchases, widgets, or push notification configuration are introduced.
- Use Supabase Auth, Postgres, Row Level Security, Storage, Realtime, and Edge Functions as the initial backend platform.
- Keep UI and domain behavior behind feature-level services or repositories instead of calling Supabase directly from presentation components.
- Treat server-side constraints and RLS as the authority for privacy and lifecycle invariants.
- Use RevenueCat for store purchase state, with server-side webhook projection into Pomelo Premium access.

## Consequences

- The app can be built primarily in TypeScript while retaining native escape hatches.
- RLS and storage policies become launch-critical and require integration tests.
- Native dependency changes require rebuilding the development client.
- Service boundaries allow UI work and backend work to proceed in parallel and allow deterministic test doubles.

## Alternatives considered

- A custom Node backend and separate Postgres database would add deployment and authentication work without improving the MVP.
- Expo Go alone cannot exercise all required native capabilities.
- Direct Supabase calls from every screen would accelerate the first screen but make privacy, testing, and later migrations harder.
