# ADR-0008: Important Dates belong to the Pair space

## Status

Accepted

## Context

Birthdays, the Pair anniversary, trips, and custom future dates are useful reminders, but they are not daily creative Moments and should not compete with the core ritual.

## Decision

- Store each member's birth date in their Profile and the anniversary on the Pair.
- Support trip and custom Important Dates owned by the Pair.
- Present the next Important Date and its countdown in a lightweight Pair space.
- Include an Important Date countdown mode in the required Widget Family.
- Do not turn Important Dates into Memories automatically or advance Streak or Pom Progress from them.

## Consequences

- Important Dates can be implemented after Pair exists without blocking the daily Moment lifecycle.
- Permissions and edit rules must distinguish Profile dates from Pair-owned dates.
- Widget updates must react to date edits, deletion, time-zone changes, logout, and unlinking.

## Alternatives considered

- Treating Important Dates as Moments was rejected because they are scheduled reminders rather than joint daily contributions.
- Omitting them from the MVP was rejected after deciding that birthdays, anniversary, travel dates, and their widget countdown add recurring practical value.
