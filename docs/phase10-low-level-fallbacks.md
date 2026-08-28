# Phase 10 — explicit low-level fallbacks

Phase 10 contains fallback mechanics that are used only when a higher-level semantic Computer Control operation cannot satisfy the task.

A working semantic capability always takes precedence. Low-level delivery must never silently weaken an existing semantic API or its postconditions.

## Lifecycle

```text
Phase 10 discovery   PHYSICALLY_OBSERVED
Phase 10A capture    PHYSICALLY_VALIDATED
Phase 10B pointer    PHYSICALLY_VALIDATED
Phase 10C drag/drop  PHYSICALLY_VALIDATED
Phase 10D wheel      PENDING
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

The blocked public s01 checkpoint also remains immutable; it stopped at fixture compilation before any public drag mutation and was corrected only in the PoC.

See `docs/api-pointer.md`, `docs/evidence/phase10c-drag-delivery-discovery-physical.md` and `docs/evidence/phase10c-pointer-drag-public-physical.md`.

## 10D — raw wheel delivery

State: `PENDING`.

Existing semantic `ui.scroll` remains preferred whenever a semantic scroll target exists. Phase 10D must not weaken or bypass its postcondition semantics.

The Phase 10 discovery proved only that a Quartz wheel event can be constructed. Before freezing any public raw-wheel contract, a dedicated physical discovery must establish actual delivery to a test-owned AppKit scroll fixture and an independently observable scroll consequence.

The first 10D discovery target is deliberately narrow:

- vertical wheel only;
- target point belongs to a test-owned AppKit scroll fixture;
- raw wheel mechanics remain separate from semantic `ui.scroll`;
- no public API is introduced by discovery;
- PASS requires the fixture to observe wheel delivery and a real scroll-position change;
- pointer/focus state is restored when the fixture closes;
- fixture coordinates and native identifiers are not persisted;
- event posting alone is not success.

Only after successful discovery should a public raw-wheel vocabulary and result boundary be frozen.

## 10E — keyboard fallback

State: `PENDING`.

Discovery proved only keyboard-event constructibility. Existing semantic text mutation, invoke and other structured APIs remain preferred. Raw keyboard delivery requires an explicit key vocabulary, modifier semantics and a separate physical checkpoint.

## OCR and vision

Image interpretation is not part of `display.capture`.

OCR/vision consumes captured or otherwise supplied image data as a separate layer. It must not convert screen coordinates or visual guesses into semantic success without an appropriate postcondition.
