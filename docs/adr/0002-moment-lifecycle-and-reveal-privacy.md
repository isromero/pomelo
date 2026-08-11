# ADR-0002: Moment lifecycle and Reveal privacy

## Status

Accepted

## Context

The core emotional payoff depends on both members contributing without seeing the other's answer, followed by a shared Reveal that creates something durable.

## Decision

- Generate one Moment per Pair and pair-local day from an active Prompt.
- Give the normal completion window 24 hours and a further 24-hour recovery window.
- Allow a member to edit locally until submitting; submission is immutable in the MVP.
- Keep Question and Photo Contributions inaccessible to the partner before Reveal through database and storage authorization, not only UI hiding.
- Mark the Moment ready only after both required Contributions are submitted.
- Allow either member to trigger an atomic, idempotent Reveal that becomes visible to both.
- Create one Memory in the same authoritative transition as Reveal.
- Do not reveal or create a joint Memory if only one member contributed.
- Treat the collaborative Doodle as an explicit format exception: strokes are visible live on the shared canvas, while the final Memory is still created only after both finish and Reveal completes.

## Consequences

- The primary acceptance seam is a two-user end-to-end journey from invitation through Memory creation.
- RLS tests must prove that hidden Contributions and media cannot be read early.
- Retry and idempotency keys are required for submission, Reveal, and Memory creation.
- Doodle requires a distinct live-session model while sharing the same Moment and Memory lifecycle.

## Alternatives considered

- Client-only hiding was rejected because it would not protect private Contributions.
- Automatically revealing immediately after the second submission was rejected because the shared discovery action is part of the ritual.
- Revealing one-sided answers after expiry was rejected because it violates participant expectations.
