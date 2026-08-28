# Phase 10D — raw wheel delivery discovery

Status: `PHYSICALLY_OBSERVED` prerequisite evidence for a future public raw-wheel fallback. This document does not by itself promote a public capability.

## Authoritative checkpoint

```text
session: cc-phase10d-wheel-delivery-discovery-s02
evidence: 6e63c9e1450db6b32510bb17250722bb3efc2f3b
observed product: 9cb037f688a82f733de520062b0adb30c0994a8b
test source: a438ce771cbd1278dbefea7c4c209e77bf2a9217
poc SHA tested: 275587696909bfe1452a346d27583f684b5a43b7
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

## Physical delivery evidence

The test used a temporary test-owned AppKit `NSScrollView` with an interior scroll baseline. It moved the pointer only inside that fixture and delivered two real Quartz line-wheel events with an exact baseline reset between signs.

Observed reference-surface mapping:

```text
wheel1=-3  -> scrollWheel delivery observed=1 -> document y direction increasing-y
wheel1=+3  -> scrollWheel delivery observed=1 -> document y direction decreasing-y
opposite qualitative directions              -> PASS
```

The result establishes actual wheel delivery plus independently observable scroll-state change. Event construction or posting alone was not sufficient for PASS.

The native sign is backend evidence, not public API vocabulary. The public fallback therefore uses canonical `direction:"up"|"down"`; on this reference surface the backend-private mapping is `up -> positive wheel1` and `down -> negative wheel1`.

## Cleanup, privacy and semantic boundary

The same checkpoint established:

- original pointer position restored;
- previous frontmost application restored by the fixture;
- fixture was fully test-owned;
- no user content was targeted;
- fixture coordinates were not persisted;
- numeric scroll offsets were not persisted;
- native display identifiers were not persisted;
- raw wheel delivery did not claim semantic success;
- existing semantic `ui.scroll` remained the preferred operation when a semantic scroll target exists.

## Historical s01 checkpoint

The earlier session remains immutable:

```text
session: cc-phase10d-wheel-delivery-discovery-s01
evidence: 34739f019fbbf098144b9010b76c14e89b57fa6e
result: FAIL
```

Its physical wheel test itself passed with the same bidirectional delivery and sign mapping. The overall session failed only because two older contract guards matched editorial wording that had changed during the Phase 10C documentation promotion. The s02 test-source updated only those two guards; the product SHA and wheel physical harness remained unchanged.

## Scope

This discovery validates vertical Quartz line-wheel delivery on the reference Mac and establishes the observed sign relationship. It does not establish horizontal wheel behavior, pixel-unit scrolling, momentum/phase semantics, trackpad gesture semantics, arbitrary application scroll consequences, multi-display conformance, or a public raw-wheel API. Those claims require separate implementation and validation evidence.
