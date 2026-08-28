# Phase 10C — public `pointer.drag` physical validation

Status: `PHYSICALLY_VALIDATED` on the current macOS reference surface.

## Authoritative checkpoint

```text
session: cc-phase10c-pointer-drag-public-s02
evidence: 1e0286c271cefddc36be7fc84008083d0658bd82
validated product: 43a26d1f369c39dbed6ca8131af8d02bd8e17b47
test source: 57f9036720f3b95af77b0803878a29bd223c63c1
poc SHA tested: 0def3a8ba72e8cceffc03ec23721e63c2504decf
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

The session exercised the real `ComputerControlClient.dragPointer()` path through the local runtime. The public result satisfied all low-level contract boundaries:

- capability advertised as `IMPLEMENTED` before promotion;
- primary display observed;
- test-owned fixture source and destination accepted only as primary-display-local logical coordinates;
- result state `DRAG_POSTED`;
- source position independently verified before button-down delivery;
- returned source and destination matched the canonical request;
- `buttonLifecycle = "POSTED"`;
- `dragDelivery = "POSTED"`;
- `releasePosted = true`;
- `semanticConsequenceVerified = false`;
- backend remained the explicit macOS Quartz fallback.

The public result therefore reports delivery mechanics only. It does not claim an arbitrary application's drag/drop semantics succeeded.

## Independent AppKit oracle

A separate test-owned AppKit process independently observed the events caused by the real public SDK call:

```text
mouseDown     count=1
mouseDragged  count=4
mouseUp       count=1
```

The fixture's hit-test-transparent marker moved to the destination as a consequence of delivered AppKit drag events. This is stronger than merely constructing or posting Quartz events.

The same checkpoint also established:

- original pointer position restored;
- previous frontmost application restored by the fixture;
- no fixture emergency release was required on PASS;
- no user content was touched;
- fixture coordinates were not persisted in evidence;
- native display identifiers were not persisted or exposed.

## Historical blocked checkpoint

The earlier session remains immutable:

```text
session: cc-phase10c-pointer-drag-public-s01
evidence: dc2bc5fc22429c1cffcba1aebf16e9fb0f506770
result: BLOCKED
```

It stopped before the public drag was executed because the test fixture contained two Swift `near(_:_:tolerance:)` declarations whose `CGPoint`/`NSPoint` signatures collided. No drag mutation began. The s02 test-source removed the redundant overload and added a build guard; the product SHA remained unchanged.

## Prerequisite delivery discovery

```text
session: cc-phase10c-drag-delivery-discovery-s01
evidence: 47ee8e31a08597cffc0c773dfaf72a093501e5c4
result: PASS
```

That earlier discovery independently established the complete native down/dragged/up lifecycle and fixture consequence before the public API was frozen.

## Scope

This validates the current public `pointer.drag` implementation on the reference Mac's current primary-display topology. It does not establish multi-display conformance, right-button dragging, timing/easing controls, cross-RPC held-button state, or semantic drag/drop success in arbitrary applications.
