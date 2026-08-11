# ADR-0004: Premium after the first Reveal

## Status

Accepted

## Context

An unknown couples app must demonstrate its value before charging, but an unrestricted freemium tier would delay validation and weaken conversion.

## Decision

- Let every Pair complete one specifically designed free Moment, experience Reveal, meet Pom, and create the first Memory without a card.
- Show the paywall after the first Reveal without obscuring the revealed result.
- Offer EUR 29.99 annual and EUR 7.99 monthly plans for the Pair.
- Highlight annual, disclose the annual charge, and use weekly or monthly equivalents only as secondary context.
- Do not offer a free trial, weekly subscription, or counter-offer at launch.
- One Subscriber purchases; RevenueCat tracks the store entitlement and the backend projects Premium onto the active Pair.
- Preserve the first Memory, Pom, and read access in Archive Mode when the paywall is closed or Premium expires.
- Prevent new Moment generation without Premium after the free allowance.
- Let Premium follow the Subscriber after unlinking rather than permanently attaching to the former Pair.

## Consequences

- Purchase identity, webhook processing, restoration, grace periods, and unlinking rules must be tested end to end.
- The partner must receive Premium access quickly without purchasing separately.
- The product can validate willingness to pay early while still demonstrating the complete core loop.

## Alternatives considered

- Hard paywall before value was rejected for a new, trust-dependent product.
- Unlimited or broad freemium was rejected because it would make monetization validation slow.
- A three-day trial, weekly plan, and cancellation counter-offer were explicitly rejected.
