# ADR-0006: Private Memories, approximate location, and widgets

## Status

Accepted

## Context

History, Map, and widgets create long-term value but expose sensitive couple content outside the core app if handled carelessly.

## Decision

- Store media privately and avoid permanent public URLs.
- Save location only with explicit consent and expose an approximate city, not precise coordinates, in shared product surfaces.
- Let a User remove location before saving and hide or delete their own Contribution later; show a stable `Content deleted` placeholder to the partner.
- Keep Map read-only in the MVP and populate it only from Memories with location.
- Build a Widget Family with status, latest revealed Memory, approximate distance, and Important Date countdown modes.
- Require explicit opt-in before visual Memory content appears in a widget and provide immediate hiding controls.
- Never show unrevealed content in a widget.
- Calculate distance from manually configured cities and show `Together` for the same city; do not claim live location or use background GPS.
- Use deep links from widgets to the corresponding Moment, Memory, Map, or Pair space.
- Implement iOS widgets with Expo native widget support and treat Android widgets as a dedicated native surface with equivalent privacy behavior.

## Consequences

- Private storage URL signing and widget image handoff require explicit lifecycle management.
- Android widget parity is a schedule risk and must be spiked early.
- Map and the required Widget Family remain MVP scope; schedule pressure must be handled by simplifying presentation, not by silently removing either capability.
- Location permission is not needed for the distance widget and should be requested only for optional Memory location capture.

## Alternatives considered

- Live distance tracking and background GPS were rejected for privacy, battery, and trust reasons.
- Public media URLs and pre-Reveal widget previews were rejected as privacy violations.
