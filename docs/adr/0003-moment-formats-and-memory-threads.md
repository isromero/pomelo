# ADR-0003: Moment formats and Memory Threads

## Status

Accepted

## Context

Pomelo needs enough daily variety to remain engaging while keeping the MVP buildable and marketable.

## Decision

- Support exactly three Moment formats at launch: Question, Photo, and Doodle.
- Question supports short text or a single A/B/C choice. A Prompt chooses one response shape.
- Photo uses a BeReal-inspired sequential rear and front capture for each member, with optional gallery selection and no simultaneous-camera requirement.
- Doodle uses one shared real-time canvas with a basic brush, five or six colors, thickness, undo, erase, and clear.
- Reveal presents the two Question or Photo Contributions together; Doodle presents the completed shared canvas.
- Every revealed Memory may host a lightweight text Thread for follow-up conversation.
- Threads do not include media replies, calls, read receipts, presence, or general chat in the MVP.

## Consequences

- Photo storage must handle four private source images per completed Pair Moment and derived BeReal-style compositions.
- Doodle strokes should be broadcast in batches and persisted as a final document rather than writing every pointer event to Postgres.
- The common Moment lifecycle must expose format-specific completion rules.

## Alternatives considered

- Video, audio, sliders, multi-part surveys, predictions, stickers, layers, and arbitrary drawing tools were rejected for launch scope.
- Two separate hidden doodles were superseded by the later decision to make Doodle collaborative in real time.
