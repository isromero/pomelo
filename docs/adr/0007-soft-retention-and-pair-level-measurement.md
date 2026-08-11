# ADR-0007: Soft retention and Pair-level measurement

## Status

Accepted

## Context

Pomelo needs a daily habit without becoming punitive. Since value is created jointly, installation-level metrics can misrepresent activation and retention.

## Decision

- Let the Pair choose a daily Moment time while respecting both members' time zones.
- Notify when the Moment is available, when the partner contributes, when it is ready, and before expiry.
- Deep link every notification to the relevant screen and allow reminders to be muted.
- Advance the shared Streak only when both members complete the Moment.
- Provide limited free Streak recovery and preserve the historical record when the active Streak breaks.
- Use cumulative Memories and Pom Progress as the primary positive retention rewards.
- Instrument the funnel from account creation through seventh completed Moment and subscription outcomes.
- Measure activation, conversion, and retention primarily at Pair level while retaining User-level diagnostics.

## Consequences

- Scheduling and analytics require a stable Pair identifier and explicit time-zone rules.
- Push tokens and notification preferences are per User, while Moment scheduling is Pair-scoped.
- Analytics must avoid storing private answer or media content.

## Alternatives considered

- Individual streaks and guilt-based reminders were rejected because they undermine the shared ritual.
- Measuring only installs or individual daily active users was rejected because one inactive partner prevents value creation.
