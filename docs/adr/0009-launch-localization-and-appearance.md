# ADR-0009: Complete launch localization and light/dark appearance

## Status

Accepted

## Context

Pomelo is Spanish-first, but Shipaton, store distribution, mixed-language Pairs, and future acquisition require a complete English experience at launch. The original visual direction was designed in a light palette, but the MVP must also respect users who expect a dark appearance throughout the app and native surfaces.

## Decision

- Ship complete Spanish and English localizations for every User-facing runtime surface and launch asset that contains text.
- Store Locale per User, default it from the device, and allow a manual override independent of the partner.
- Model each daily Prompt as one semantic concept with Spanish and English variants so both members receive the same question or activity in their own Locale.
- Localize UI, onboarding, errors, notifications, widgets, paywall, accessibility labels, dates, numbers, prices, terms, privacy, support entry points, and store metadata.
- Avoid hard-coded User-facing strings, sentence concatenation, and layout assumptions tied to Spanish length.
- Ship system, light, and dark appearance preferences. `System` follows the operating system while light and dark are explicit overrides.
- Implement appearance through semantic tokens rather than per-screen color substitutions. Pom assets, photos, doodles, maps, paywall, native pickers, notifications, and widgets must remain legible and private in both themes.
- Preserve the approved warm, neutral Pomelo identity in dark mode instead of converting it into an unrelated black theme.

## Consequences

- Prompt operations must validate translation completeness before activation.
- Pair state stores Prompt identity independently from the localized copy rendered for either member.
- Every feature acceptance path and visual review includes ES/EN and light/dark coverage.
- Native widgets and system surfaces need localized strings and theme-aware assets for both platforms.
- The designer must define dark semantic tokens and approve Pom legibility in both modes.

## Alternatives considered

- Shipping only Spanish with a language field reserved for later was rejected because it would leave internationalization unproven and weaken the Shipaton and store launch.
- Shipping English as a partial or fallback experience was rejected because mixed untranslated surfaces undermine trust.
- Keeping the light theme as the only launch variant was rejected because dark appearance is now explicit MVP scope.
