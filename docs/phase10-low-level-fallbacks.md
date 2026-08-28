# Phase 10 — explicit low-level fallbacks

Phase 10 contains fallback mechanics that are used only when a higher-level semantic Computer Control operation cannot satisfy the task.

A working semantic capability always takes precedence. Low-level delivery must never silently weaken an existing semantic API or its postconditions.

## Lifecycle

```text
Phase 10 discovery   PHYSICALLY_OBSERVED
Phase 10A capture    PHYSICALLY_VALIDATED
Phase 10B pointer    PHYSICALLY_VALIDATED
Phase 10C drag/drop  PHYSICALLY_VALIDATED
Phase 10D wheel      PHYSICALLY_VALIDATED
Phase 10E keyboard   PENDING
OCR / vision         PENDING (separate interpretation layer)
```

`PHYSICALLY_OBSERVED` for discovery means native primitives or delivery behavior were inspected on real hardware; it is not by itself a public capability validation state.

## 10A — primary display capture

`client.captureDisplay({display:"primary"})` is `PHYSICALLY_VALIDATED` on the current macOS reference surface. See `docs/api-display-capture.md` and `docs/evidence/phase10a-display-capture-physical.md`.

## 10B — pointer move/click fallback

Public APIs:

```js
client.movePointer({display:"primary", x, y})
client.clickPointer({display:"primary", x, y, button:"left"|"right"})
```

State: `PHYSICALLY_VALIDATED` on the current macOS reference surface.

Authoritative public checkpoint:

```text
session: cc-phase10b-pointer-public-s03
evidence: a7b878ff25e56ee7c16705dfdec1468f6a47b0a1
validated product: 3f68502848f127d73f72cac023deed511f3ce75d
result: 43 PASS / 0 FAIL / 0 BLOCKED
```

`CLICK_POSTED` reports low-level button posting only. It does not mean the intended semantic action succeeded.

## 10C — drag/drop fallback

Public API:

```js
client.dragPointer({
  display:"primary",
  source:{x,y},
  destination:{x,y},
  button:"left"
})
```

State: `PHYSICALLY_VALIDATED` on the current macOS reference surface.

Authoritative public checkpoint:

```text
session: cc-phase10c-pointer-drag-public-s02
evidence: 1e0286c271cefddc36be7fc84008083d0658bd82
validated product: 43a26d1f369c39dbed6ca8131af8d02bd8e17b47
test source: 57f9036720f3b95af77b0803878a29bd223c63c1
poc SHA tested: 0def3a8ba72e8cceffc03ec23721e63c2504decf
result: PASS
```

The public SDK call returned the expected low-level `DRAG_POSTED` boundary. A separate test-owned AppKit oracle independently observed exactly one mouse-down, four mouse-dragged events and one mouse-up; its hit-test-transparent marker reached the destination. The pointer was restored, no emergency release was needed, no user content was touched and no fixture coordinates or native display identifiers were persisted.

The public contract remains deliberately narrow:

- one atomic primary-display fallback operation;
- source and destination are explicit primary-display-local logical coordinates and must differ;
- left button only;
- no public timing, step-count or easing controls;
- source location is independently re-observed before button-down;
- complete normal down/drag/up lifecycle is constructed before button-down and owned by one call;
- normal success requires the terminating button-up to have been posted;
- any emergency release path is not success;
- result state is `DRAG_POSTED`, not semantic `DROPPED`;
- `semanticConsequenceVerified` is always false;
- public `pointer.down`/`pointer.up` remain absent.

Prerequisite delivery discovery remains immutable:

```text
session: cc-phase10c-drag-delivery-discovery-s01
evidence: 47ee8e31a08597cffc0c773dfaf72a093501e5c4
result: PASS
```

See `docs/api-pointer.md`, `docs/evidence/phase10c-drag-delivery-discovery-physical.md` and `docs/evidence/phase10c-pointer-drag-public-physical.md`.

## 10D — raw wheel delivery

Public API:

```js
client.wheelPointer({
  display:"primary",
  x,
  y,
  direction:"up"|"down",
  amount:1
})
```

State: `PHYSICALLY_VALIDATED` on the current macOS reference surface.

Existing semantic `ui.scroll` remains preferred whenever a semantic scroll target exists. `pointer.wheel` is an explicit coordinate fallback and must not weaken or bypass `ui.scroll` postcondition semantics.

Authoritative public checkpoint:

```text
session: cc-phase10d-pointer-wheel-public-s01
evidence: b1ed223bb401ab79b5b7e6cc11c8512347afe0be
validated product: a3fcd4cbaa4f770e59bd974c0239b9af35701e99
test source: 7a0d62b2723bd0dca11e57a9b8aa931251a6f475
poc SHA tested: 37b03c1e7a59f712bfa674122fb636b5ca24447b
result: PASS
```

The real SDK/runtime path was exercised twice against a separate test-owned AppKit `NSScrollView` oracle. Canonical `direction:"down", amount:3` produced one independently observed wheel event and an `increasing-y` viewport consequence. After exact baseline reset, canonical `direction:"up", amount:3` produced one independently observed wheel event and a `decreasing-y` consequence. The directions were therefore observed as opposite end-to-end.

The native sign mapping remains backend-private. The public result exposed only canonical direction/amount and `WHEEL_POSTED`, kept `semanticConsequenceVerified:false`, restored pointer/focus, touched no user content and persisted no fixture coordinates, offsets or native display identifiers.

The public contract remains deliberately narrow:

- vertical wheel only;
- one explicit primary-display-local target point;
- canonical `direction` only `up` or `down`;
- `amount` integer `1..10` in line units;
- target position is independently re-observed before posting;
- native wheel sign, secondary axes, pixel units, phase/momentum and gestures remain private/unsupported;
- success state is `WHEEL_POSTED`;
- `wheelDelivery` is only `POSTED`;
- `semanticConsequenceVerified` is always false;
- event posting alone does not establish that an arbitrary application's intended semantic scroll occurred.

Prerequisite delivery discovery remains immutable:

```text
session: cc-phase10d-wheel-delivery-discovery-s02
evidence: 6e63c9e1450db6b32510bb17250722bb3efc2f3b
result: PASS
```

See `docs/api-pointer.md`, `docs/evidence/phase10d-wheel-delivery-discovery-physical.md` and `docs/evidence/phase10d-pointer-wheel-public-physical.md`.

## 10E — keyboard fallback

State: `PENDING`.

Discovery proved only keyboard-event constructibility. Existing semantic text mutation, invoke and other structured APIs remain preferred. Raw keyboard delivery requires an explicit key vocabulary, modifier semantics and a separate physical checkpoint.

The next 10E discovery must remain test-owned and precede any public keyboard contract. It should physically establish at minimum:

- printable text delivery to an AppKit text fixture;
- one special-key delivery with an independently observable fixture consequence;
- modifier delivery observed by the fixture;
- key-down/key-up lifecycle completion and cleanup;
- native virtual-key identifiers kept private and referenced only through symbolic platform constants internally;
- no public API frozen by the discovery itself.

## OCR and vision

Image interpretation is not part of `display.capture`.

OCR/vision consumes captured or otherwise supplied image data as a separate layer. It must not convert screen coordinates or visual guesses into semantic success without an appropriate postcondition.
