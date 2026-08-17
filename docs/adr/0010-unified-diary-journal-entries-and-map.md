# ADR-0010: Unified Diary, Journal Entries, and confirmed places

## Status

Accepted

## Context

Revealed Memories preserve Pomelo's daily ritual, but they cannot represent past experiences, plans, trips, or events added outside that ritual. Keeping custom Important Dates in Pair space and approximate Memory cities in a separate Map fragments one shared history into unrelated surfaces. A single location also misrepresents a joint Moment completed by partners in different places.

## Decision

- Keep Memory as the automatic, immutable result of Reveal and exclude Memories from Map.
- Introduce Pair-owned Journal Entries for manually authored past, present, or future content.
- Present Memories, Journal Entries, birthdays, and anniversary in one Diary with History, Calendar, and Map views.
- Derive lived or upcoming state from dates instead of asking Users to choose a content type.
- Support optional end date, time, yearly recurrence, private photos, and a Thread on Journal Entries.
- Replace custom Important Dates and trips with future or recurring Journal Entries. Keep Profile birthdays and Pair anniversary as calculated milestones.
- Let either Pair member edit or delete a Journal Entry. Use optimistic versions to reject stale writes.
- Store at most one optional exact pin per Journal Entry. A User must explicitly confirm it in a foreground map selector; no location is inferred, captured in the background, or attached to a Moment.
- Give each Pair one lifetime Journal Entry creation without Premium. Existing entries remain editable when Premium expires, but new creation requires Premium after that allowance is consumed.
- Keep widget rendering Premium. Its next-date contract selects the nearest eligible Journal Entry occurrence, birthday, or anniversary.
- Journal Entries do not create Memories and do not advance Streak or Pom Progress.

## Consequences

- History and Map routes become compatibility redirects into Diary.
- Thread storage must support either a Memory or Journal Entry target.
- Exact coordinates are sensitive Pair data and require RLS, removal, private analytics, and foreground-only permissions.
- Recurring occurrences are projections and are not copied into persistent entries every year.
- Notification scheduling for future Journal Entries belongs to the notification issue and must react to create, edit, delete, recurrence, Locale, and time-zone changes.

## Alternatives considered

- Two creation types, Memory and Special Day, were rejected because date already determines whether an entry is lived or upcoming.
- Attaching each member's location to a revealed Memory was rejected because it describes where Contributions were submitted rather than where a shared experience belongs.
- Keeping Map as a separate bottom-level product area was rejected because History, Calendar, and Map are projections of the same Diary.
