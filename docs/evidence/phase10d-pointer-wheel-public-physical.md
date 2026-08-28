# Phase 10D — public `pointer.wheel` physical validation

Status: `PHYSICALLY_VALIDATED` on the current macOS reference surface.

## Authoritative checkpoint

```text
session: cc-phase10d-pointer-wheel-public-s01
evidence: b1ed223bb401ab79b5b7e6cc11c8512347afe0be
validated product: a3fcd4cbaa4f770e59bd974c0239b9af35701e99
test source: 7a0d62b2723bd0dca11e57a9b8aa931251a6f475
poc SHA tested: 37b03c1e7a59f712bfa674122fb636b5ca24447b
result: PASS
```

Environment:

```text
macOS 26.5.2 (25F84)
arm64
Node v26.7.0
Apple Swift 6.3.3
Accessibility trusted
```

## Public runtime/SDK evidence

The session exercised the real `ComputerControlClient.wheelPointer()` path through the local runtime. Before promotion the capability was advertised as `IMPLEMENTED`.

For canonical `direction:"down", amount:3`, the public result satisfied the low-level contract:

- state `WHEEL_POSTED`;
- primary-display-local target position independently verified before posting;
- returned position matched the canonical request;
- `wheelDelivery = "POSTED"`;
- `semanticConsequenceVerified = false`;
- backend remained the explicit macOS Quartz fallback.

A separate test-owned AppKit `NSScrollView` oracle independently observed exactly one wheel event and a real viewport consequence in the `increasing-y` direction.

After an exact fixture baseline reset, the same real SDK path was exercised with canonical `direction:"up", amount:3`. The public result again satisfied the delivery-only contract, and the independent oracle observed exactly one wheel event with a real `decreasing-y` viewport consequence.

The two canonical directions therefore produced opposite independently observed scroll consequences through the public runtime/SDK path.

## Native-sign privacy

The reference macOS backend privately maps canonical direction to the physically discovered Quartz wheel-axis sign. The public request/result do not expose native wheel signs or secondary axes.

The public checkpoint explicitly established that native sign remained private. Fixture coordinates, numeric scroll offsets and native display identifiers were not persisted in evidence.

## Safety and semantic boundary

The fixture was fully test-owned. The original pointer position and previous frontmost application were restored after the test. No user content was touched.

`WHEEL_POSTED` reports low-level event posting only. It does not establish that an arbitrary application scrolled the intended semantic container or reached an intended semantic state. Existing semantic `ui.scroll` remains preferred whenever a semantic target and postcondition are available.

## Prerequisite delivery discovery

```text
session: cc-phase10d-wheel-delivery-discovery-s02
evidence: 6e63c9e1450db6b32510bb17250722bb3efc2f3b
result: PASS
```

That discovery established, before the public vocabulary was frozen, real Quartz-to-AppKit wheel delivery and the reference-surface sign mapping:

```text
native negative axis-1 line delta -> increasing-y
native positive axis-1 line delta -> decreasing-y
```

The earlier discovery s01 remains immutable. Its physical wheel test passed, but the overall session failed because of two stale documentation regex guards; s02 corrected only those PoC guards and repeated the same physical discovery successfully.

## Scope

This validates the current public `pointer.wheel` implementation on the reference Mac's current primary-display topology for vertical line-wheel delivery, canonical directions `up`/`down`, and amount `1..10` as defined by the public contract. It does not establish horizontal wheel axes, pixel-unit scrolling, momentum/phase gestures, multi-display conformance, or semantic scroll success in arbitrary applications.
