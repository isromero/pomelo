# Pomelo domain context

Pomelo is a private daily ritual for couples. Each day the pair creates one small thing together, reveals it, and adds it to a shared history. The product is intentionally lighter than therapy, journaling, or a virtual pet: it should feel easy, warm, neutral, and acceptable for either partner to introduce.

## Product language

Use these terms consistently in product specifications, code, tests, analytics, and issues.

### User

An authenticated person using Pomelo. A User owns an account, a Profile, Contributions, purchases, and privacy controls.

### Profile

The User's visible name, required avatar, birth date, locale, appearance preference, notification settings, and optional configured city. Do not call a Profile an account.

### Pair

The active relationship space shared by exactly two Users. A User may belong to only one active Pair at a time. Use Pair in technical documentation and `pareja` in Spanish product copy.

### Invitation

A single-use link and alternative code that lets the second User join a Pair. An Invitation may be pending, accepted, cancelled, or expired.

### Moment

The single daily activity offered to a Pair. A Moment has one Prompt, one format, a lifecycle, and at most one Contribution per member. Always capitalize Moment in product copy. Do not call it a drop, challenge, check-in, or task.

### Prompt

The semantic content instruction for a Moment. A Prompt has a stable concept identifier, localized variants, format, intimacy level, activation status, and expected response type. Both Pair members receive the same Prompt concept even when they use different locales.

### Locale

The User's preferred product language. Launch locales are Spanish and English. Locale applies to UI, Prompt variants, notifications, widgets, paywall, dates, errors, and accessibility labels without changing shared Pair state.

### Appearance

The User's preferred visual mode: follow system, light, or dark. Both launch themes use the same semantic design tokens and preserve the Pomelo brand.

### Contribution

What one member adds to a Moment. For Question and Photo Moments, a Contribution remains private until Reveal. A Doodle Moment uses a shared live canvas and is the explicit exception to hidden independent Contributions.

### Reveal

The transition that makes a completed Moment visible to both members. Either member may trigger it once the Moment is ready. Reveal is pair-wide and idempotent.

### Memory

The durable result created automatically by Reveal. A Memory contains the original Prompt, available Contributions, date, and Pom reaction. Only revealed Moments create Memories. A Memory is not a manually authored journal entry and never carries a Map location.

### Journal Entry

A manually authored item owned by the Pair. A Journal Entry has a title, optional text and private photos, a start date, optional end date and time, optional yearly recurrence, optional confirmed place, and a Thread. Its date determines whether it is presented as lived or upcoming; Users never choose a separate memory or special-day type.

### Diary

The shared container that combines revealed Memories, Journal Entries, birthdays, and the Pair anniversary. Diary exposes History, Calendar, and Map views without changing the lifecycle or ownership rules of each source.

### History

The chronological view inside Diary. It shows upcoming Journal Entry occurrences and milestones before the reverse-chronological collection of revealed Memories and lived Journal Entries.

### Calendar

The date-based view inside Diary. It projects Memories, Journal Entries, birthdays, and the Pair anniversary without materializing recurring duplicates.

### Map

The geographic view inside Diary. It contains only Journal Entries with an optional place explicitly confirmed by a Pair member. The confirmed pin is visible to both Pair members, but Pomelo never captures it in the background or infers it from a Moment.

### Thread

The lightweight follow-up conversation attached to a revealed Memory or Journal Entry. It is not a general-purpose chat and does not exist outside a Diary item.

### Pom

The shared mascot and reward surface. Pom reacts, progresses, and unlocks expressions or accessories as the Pair creates Memories. Pom is not a pet with needs and never punishes inactivity.

### Streak

The number of consecutive Moments completed by both members within their completion or recovery windows. A one-sided Contribution never advances the Streak.

### Progress

The Pair's cumulative reward state derived from revealed Memories. The first Memory introduces Pom; accessories unlock at 2, 7, 14, and 30 Memories. Progress never decreases and does not depend on Streak.

### Important Date

A recurring birthday sourced from a Profile or anniversary sourced from the Pair. Custom dates and trips are Journal Entries instead. Important Dates are projected into Diary and countdown surfaces without creating duplicate entries.

### Premium

The entitlement that allows an active Pair to generate new Moments after the free first Moment. One Subscriber owns the purchase; both active Pair members receive access while linked.

### Subscriber

The User who purchases and retains ownership of Premium. If the Pair is dissolved, the entitlement follows the Subscriber and may apply to a future active Pair.

### Archive Mode

The preservation state entered when a Pair has no Premium access or has been dissolved. Existing permitted Memories and Journal Entries remain readable. A linked Pair without Premium may edit existing Journal Entries but cannot create another after consuming its free entry; a dissolved Pair is read-only except for privacy removal controls.

### Widget Family

The native home-screen surfaces for Moment status, latest revealed Memory, approximate distance, and Important Date countdowns. Widgets never expose hidden Contributions.

## Core invariants

1. A User has at most one active Pair.
2. A Pair has at most two active members.
3. A Pair receives at most one Moment for a given pair-local day.
4. Question and Photo Contributions are unreadable by the partner before Reveal.
5. A Moment is ready only after all required Contributions exist; Doodle readiness is based on both members completing the shared canvas ritual.
6. Reveal is atomic, pair-wide, and can be triggered by either member.
7. A Memory is created exactly once and only from a revealed Moment.
8. A one-sided or expired incomplete Moment never creates a joint Memory.
9. The first designed Moment is free and requires no payment card.
10. After the free Reveal, new Moments require Premium; the first Memory remains readable.
11. Premium ownership belongs to the Subscriber, while access is projected onto the Subscriber's active Pair.
12. Pom never becomes hungry, ill, sad, or punitive because the Pair was inactive.
13. Journal Entry location is optional, manually confirmed, removable, Pair-private, and never represented as live or background tracking.
14. Visual widget content is opt-in and appears only after Reveal.
15. Pair-level activation and retention are the primary product metrics.
16. Every launch surface is fully localized in Spanish and English; no User-facing string may depend on a hard-coded source language.
17. Every launch surface supports light and dark appearance without changing domain behavior or exposing hidden content.
18. Journal Entries never create Memories and never advance Streak or Progress.
19. A Pair receives exactly one lifetime Journal Entry creation without Premium; deleting it does not restore the allowance.

## Lifecycle summary

```text
scheduled -> open -> partially_submitted -> ready -> revealed -> remembered
                     \-> expired_incomplete

open/partially_submitted -> recovery -> ready
```

Archive Mode affects whether a new Moment may be generated; it does not destroy existing permitted Memories.
