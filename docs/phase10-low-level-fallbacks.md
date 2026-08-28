# Phase 10 — explicit low-level fallbacks

Phase 10 contains fallback mechanics that are used only when a higher-level semantic Computer Control operation cannot satisfy the task.

A working semantic capability always takes precedence. Low-level delivery must never silently weaken an existing semantic API or its postconditions.

## Lifecycle

```text
Phase 10 discovery   PHYSICALLY_OBSERVED
Phase 10A capture    PHYSICALLY_VALIDATED
Phase 10B pointer    PENDING
Phase 10C drag/drop  PENDING
Phase 10D wheel      PENDING
Phase 10E keyboard   PENDING
OCR / vision         PENDING (separate interpretation layer)
```

`PHYSICALLY_OBSERVED` for discovery means the native primitives were inspected on real hardware; it is not a public capability validation state.

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

## 10B — pointer move/button delivery

State: `PENDING`.

Discovery proved only that Quartz mouse move and left/right button events can be constructed. It did not post them. Public design therefore waits for a deterministic physical fixture that can independently observe pointer movement and button delivery/consequence.

Coordinates must be explicit low-level coordinates. They must never replace a semantic element target when a semantic operation exists.

## 10C — drag/drop

State: `PENDING`.

Drag is a compound stateful input sequence, not an alias for click or pointer movement. It requires deterministic source/destination semantics, button-state handling, cancellation/failure behavior and an independent postcondition.

## 10D — wheel/gesture delivery

State: `PENDING`.

Discovery proved only wheel-event constructibility. Existing semantic `ui.scroll` remains preferred. Raw wheel delivery requires its own contract and physical evidence.

## 10E — keyboard fallback

State: `PENDING`.

Discovery proved only keyboard-event constructibility. Existing semantic text mutation, invoke and other structured APIs remain preferred. Raw keyboard delivery requires an explicit key vocabulary, modifier semantics and a separate physical checkpoint.

## OCR and vision

Image interpretation is not part of `display.capture`.

OCR/vision consumes captured or otherwise supplied image data as a separate layer. It must not convert screen coordinates or visual guesses into semantic success without an appropriate postcondition.
