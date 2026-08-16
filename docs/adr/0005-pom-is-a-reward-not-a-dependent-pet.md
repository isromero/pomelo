# ADR-0005: Pom is a reward, not a dependent pet

## Status

Accepted

## Context

Pom differentiates the brand, makes progress visible, and creates strong marketing hooks. A Tamagotchi-like dependency loop would introduce guilt and a much larger game economy.

## Decision

- Use the `Pom / Original` mascot as the primary reference.
- Let Pom react to Reveal, appear on Home and widgets, and reflect Pair Progress.
- Launch with one physical stage, approximately six expressions, three reusable reactions, and approximately four unlockable accessories.
- Include a simple place to view and select unlocked accessories.
- Use six functional expressions: calm, happy, excited, surprised, affectionate, and proud.
- Build three reusable motion reactions from those expressions: idle, Reveal, and accessory unlock.
- Introduce Pom with the first Memory and unlock accessories at 2, 7, 14, and 30 revealed Memories.
- Count exactly one Progress step per revealed Memory, regardless of Question, Photo, or Doodle format. Threads, Important Dates, purchases, app opens, unilateral Contributions, and Streak recovery do not count.
- Treat the wardrobe as a shared Pair preference: either member may equip one unlocked accessory or choose `No accessory`; the latest valid selection becomes visible to both.
- Never remove an unlocked accessory because Streak breaks or Premium expires. Already unlocked accessories remain viewable and selectable for an active archived Pair.
- Do not give Pom hunger, illness, sadness, death, or negative inactivity states.
- Do not launch coins, a store, a room, minigames, multiple pets, or full physical evolutions.
- Do not make cosmetic microtransactions part of the committed MVP monetization model.

## Consequences

- Pom assets can remain finite and reusable for the deadline.
- Streak loss and paywall closure cannot use Pom as emotional punishment.
- Each accessory must be delivered separately from Pom with a stable anchor so the same asset works across expressions, Home, Reveal, and widgets.
- Future cosmetic monetization remains possible but requires a separate decision.

## Alternatives considered

- A full virtual-pet loop was rejected as distracting, gender-skewed, and expensive to produce.
- Removing Pom was rejected because it weakens branding, reward, widgets, and acquisition hooks.
