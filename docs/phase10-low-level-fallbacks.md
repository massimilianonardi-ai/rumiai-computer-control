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
Phase 10E keyboard   PHYSICALLY_VALIDATED
OCR / vision         PENDING (separate interpretation layer)
```

The Phase 10A-10E low-level mechanics are complete on the current macOS reference surface. OCR/vision is not a missing low-level input mechanic: it is a separate interpretation layer over captured or otherwise supplied image data.

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

Public API:

```js
client.pressKey({key:"a", modifiers:[]})
client.pressKey({key:"a", modifiers:["shift"]})
client.pressKey({key:"enter", modifiers:[]})
```

State: `PHYSICALLY_VALIDATED` on the current macOS reference surface.

Existing semantic text mutation, invoke and other structured APIs remain preferred. `keyboard.press` is a low-level fallback and does not claim that an arbitrary application accepted text, triggered a shortcut or reached an intended semantic state.

Authoritative public checkpoint:

```text
session: cc-phase10e-keyboard-public-s02
evidence: c5db7fffdccdbcca35e9918c3e547641f98f4059
validated product: e2eb419c352f5996ce45ad6c13b37d7ea52c8c21
test source: cfc8460f31772f5e6f6a10505fbc71fc9f6d8887
poc SHA tested: 852d6a69b9701af8c368e66dad411fb163f0d1f7
result: PASS
```

The real SDK/runtime path was exercised against a separate test-owned AppKit `NSTextView` oracle. Plain `a` produced exactly one key-down and one key-up plus the lowercase fixture consequence. Enter produced exactly one down/up pair plus newline. Shift+A produced exactly one Shift-on and one Shift-off transition, one shifted A down/up pair and the uppercase fixture consequence. No emergency modifier release was required, the previous frontmost application was restored, and evidence markers persisted neither numeric keycodes nor user text.

The public result remained delivery-only (`KEY_POSTED`, `semanticConsequenceVerified:false`) even when the independent oracle observed fixture consequences.

Historical public s01 evidence `707a97154f652e8e21f2e54f87c61144f996c80a` remains preserved with overall `FAIL`. It established that back-to-back Shift/key event posting was insufficient for the separate AppKit oracle. The forward-only product fix introduced short internal settling intervals and s02 validated that corrected implementation.

Authoritative delivery discovery remains immutable:

```text
session: cc-phase10e-keyboard-delivery-discovery-s01
evidence: 1aa6efa523dab83d7dd5e2b14fb1b6deb83dc324
result: PASS
```

The public contract remains deliberately narrow:

- only canonical key `a` and `enter`;
- only modifier `shift`;
- only the three discovered key/modifier tuples are accepted;
- complete key/modifier lifecycle belongs to one call;
- no public key-down, key-up or held-modifier state;
- numeric virtual-key codes and platform flags remain private;
- success state is `KEY_POSTED`;
- `semanticConsequenceVerified` is always false;
- any future vocabulary expansion requires separate evidence rather than guessed native identifiers.

See `docs/api-keyboard.md`, `docs/evidence/phase10e-keyboard-delivery-discovery-physical.md` and `docs/evidence/phase10e-keyboard-public-physical.md`.

## OCR and vision boundary

Image interpretation is not part of `display.capture` or the Phase 10A-10E low-level mechanics.

OCR/vision consumes captured or otherwise supplied image data as a separate interpretation layer. Its output may propose text, regions or coordinate candidates, but it must not convert a visual guess into semantic success. Any subsequent Computer Control mutation still requires the postcondition appropriate to the chosen semantic or low-level operation.

This separation allows visual interpretation to evolve independently of capture and input delivery, and prevents the fallback layer from treating uncertain pixel interpretation as a verified UI target.
