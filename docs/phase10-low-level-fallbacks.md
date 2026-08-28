# Phase 10 — explicit low-level fallbacks

Phase 10 contains fallback mechanics that are used only when a higher-level semantic Computer Control operation cannot satisfy the task.

A working semantic capability always takes precedence. Low-level delivery must never silently weaken an existing semantic API or its postconditions.

## Lifecycle

```text
Phase 10 discovery   PHYSICALLY_OBSERVED
Phase 10A capture    PHYSICALLY_VALIDATED
Phase 10B pointer    PHYSICALLY_VALIDATED
Phase 10C drag/drop  PENDING
Phase 10D wheel      PENDING
Phase 10E keyboard   PENDING
OCR / vision         PENDING (separate interpretation layer)
```

`PHYSICALLY_OBSERVED` for discovery means native primitives or delivery behavior were inspected on real hardware; it is not by itself a public capability validation state.

## Discovery checkpoint

```text
session: cc-phase10-low-level-fallback-discovery-s03
evidence: ae385e0746d58bcf4c1c41ba6a8641fa8d258fc5
observed product: 82c7ac2cd1d842d50db5a27339a563e2cec919c6
test source: 5a580668bf3e0edad1749f0c9c814b471599c9e6
poc SHA tested: 15f333ca0eb00972c120d9cd0cb7ca86ea49fd0e
result: 40 PASS / 0 FAIL / 0 BLOCKED
```

See `docs/evidence/phase10-low-level-fallback-discovery-physical.md`.

## 10A — primary display capture

Public API:

```js
client.captureDisplay({display:"primary"})
```

State: `PHYSICALLY_VALIDATED` on the current macOS reference surface.

Implementation boundary:

- ScreenCaptureKit single-frame capture;
- current primary display only;
- PNG output only;
- cursor excluded;
- no native display identifier exposed;
- no automatic Screen Recording permission request;
- canonical base64 plus PNG signature/byte-count validation;
- maximum encoded PNG size 20 MiB;
- screenshot bytes returned to the caller but not persisted/logged by the capture operation;
- width/height describe returned image pixels, not physical panel-pixel identity.

Authoritative public checkpoint:

```text
session: cc-phase10a-display-capture-s03
evidence: 4d215cace1cf30fa5837852e17dcb273f8e969c3
validated product: ec3cd5f07defacdbe8b634a61b99d5510f77d832
test source: 2375e53952ef72afd32c61a5d79e9b97d374f88c
poc SHA tested: ebc1a4ef9bdeebabf4e359353b5c312f9e015a11
result: PASS
observed PNG: 1710 × 1107, 1025899 bytes
```

The independent oracle decoded the public PNG, independently observed primary-display dimensions and obtained a separate ScreenCaptureKit frame with matching dimensions. No screenshot payload/base64 was logged or persisted by the product or physical harness.

See `docs/api-display-capture.md` and `docs/evidence/phase10a-display-capture-physical.md`.

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
test source: a3cd3f6b143d4c2e74d1d831218778ea19a3e48b
poc SHA tested: 1271dd80d331d97005e8e99c00b98af116f66225
result: 43 PASS / 0 FAIL / 0 BLOCKED
```

The physical test exercised the real runtime and SDK against a temporary test-owned AppKit fixture. It independently observed exactly one left down/up and one right down/up, verified the public move postcondition, restored the original pointer position, clicked no user content and persisted no fixture coordinates or native display identifiers.

The public contract remains deliberately narrow:

- primary display only;
- coordinates are primary-display-local, top-left origin, in `display.list` logical units;
- `pointer.move` succeeds only after the requested position is independently re-observed and therefore returns `verified:true`;
- `pointer.click` independently verifies position immediately before posting a complete down/up pair;
- button posting is reported as `buttonDelivery:"POSTED"`, not as verified semantic success;
- `semanticConsequenceVerified` is always false for the raw click API;
- separate `pointer.down`/`pointer.up` remain non-public;
- native display identifiers and global desktop identity remain private.

Prerequisite delivery discovery remains immutable:

```text
session: cc-phase10b-pointer-delivery-discovery-s02
evidence: 4c973a4400660417cfb39fb8297cd363e8c13c63
result: 42 PASS / 0 FAIL / 0 BLOCKED
```

Coordinates must remain explicit low-level fallback coordinates. They must never replace a semantic element target when a semantic operation exists. `CLICK_POSTED` does not mean the intended semantic action succeeded.

See `docs/api-pointer.md`, `docs/evidence/phase10b-pointer-public-physical.md` and `docs/evidence/phase10b-pointer-delivery-discovery-physical.md`.

## 10C — drag/drop

State: `PENDING`.

Drag is a compound stateful input sequence, not an alias for click or pointer movement. It requires deterministic source/destination coordinates, a button-state lifecycle owned by one operation, release cleanup on failure, and an independent postcondition. Phase 10B intentionally does not expose a held-button state across RPC calls.

The initial 10C design target is one atomic primary-display fallback operation that owns move-to-source → button-down → dragged movement → button-up. Discovery/physical validation must use a test-owned fixture with an independently observable drag consequence before any public contract is frozen.

## 10D — wheel/gesture delivery

State: `PENDING`.

Discovery proved only wheel-event constructibility. Existing semantic `ui.scroll` remains preferred. Raw wheel delivery requires its own contract and physical evidence.

## 10E — keyboard fallback

State: `PENDING`.

Discovery proved only keyboard-event constructibility. Existing semantic text mutation, invoke and other structured APIs remain preferred. Raw keyboard delivery requires an explicit key vocabulary, modifier semantics and a separate physical checkpoint.

## OCR and vision

Image interpretation is not part of `display.capture`.

OCR/vision consumes captured or otherwise supplied image data as a separate layer. It must not convert screen coordinates or visual guesses into semantic success without an appropriate postcondition.
