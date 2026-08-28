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
Phase 10E keyboard   IMPLEMENTED
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
client.dragPointer({display:"primary", source:{x,y}, destination:{x,y}, button:"left"})
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

## 10D — raw wheel delivery

Public API:

```js
client.wheelPointer({display:"primary", x, y, direction:"up"|"down", amount:1})
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

The real SDK/runtime path was exercised twice against a separate test-owned AppKit `NSScrollView` oracle. Canonical `direction:"down", amount:3` produced one independently observed wheel event and an `increasing-y` viewport consequence. After exact baseline reset, canonical `direction:"up", amount:3` produced one independently observed wheel event and a `decreasing-y` consequence. The native sign mapping remains backend-private.

## 10E — keyboard fallback

Public candidate API:

```js
client.pressKey({key:"a", modifiers:[]})
client.pressKey({key:"a", modifiers:["shift"]})
client.pressKey({key:"enter", modifiers:[]})
```

State: `IMPLEMENTED`. A dedicated public runtime/SDK physical checkpoint is required before promotion.

Existing semantic text mutation, invoke and other structured APIs remain preferred. `keyboard.press` is a low-level fallback and does not claim that an arbitrary application accepted text, triggered a shortcut or reached an intended semantic state.

Authoritative delivery discovery:

```text
session: cc-phase10e-keyboard-delivery-discovery-s01
evidence: 1aa6efa523dab83d7dd5e2b14fb1b6deb83dc324
observed product: 0f4d2c0378b12df50ed192721dded97edff9f72e
test source: fd462455a0b989b459d63d5a3d5833420a191d2f
poc SHA tested: ddd7f69cffe3b2eed67b9e3dfc2a7bd57179d589
result: PASS
```

The test-owned AppKit text fixture independently established three physically grounded tuples:

- `a` with no modifiers: one key-down, one key-up, lowercase text consequence;
- `enter` with no modifiers: one key-down, one key-up, newline consequence;
- `a` with `shift`: Shift on/off transitions, shifted key observation and uppercase text consequence.

The public contract is deliberately narrower than a general keyboard API:

- only canonical key `a` and `enter`;
- only modifier `shift`;
- only the three discovered key/modifier tuples are accepted;
- complete key/modifier lifecycle belongs to one call;
- no public key-down, key-up or held-modifier state;
- numeric virtual-key codes and platform flags remain private;
- success state is `KEY_POSTED`;
- `semanticConsequenceVerified` is always false;
- any future vocabulary expansion requires separate evidence rather than guessed native identifiers.

See `docs/api-keyboard.md` and `docs/evidence/phase10e-keyboard-delivery-discovery-physical.md`.

## OCR and vision

Image interpretation is not part of `display.capture`.

OCR/vision consumes captured or otherwise supplied image data as a separate layer. It must not convert screen coordinates or visual guesses into semantic success without an appropriate postcondition.
