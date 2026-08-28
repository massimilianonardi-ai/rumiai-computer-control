# Phase 10 low-level fallback discovery — physical evidence

## Authoritative checkpoint

```text
session: cc-phase10-low-level-fallback-discovery-s03
evidence: ae385e0746d58bcf4c1c41ba6a8641fa8d258fc5
observed product: 82c7ac2cd1d842d50db5a27339a563e2cec919c6
test source: 5a580668bf3e0edad1749f0c9c814b471599c9e6
poc SHA tested: 15f333ca0eb00972c120d9cd0cb7ca86ea49fd0e
result: 40 PASS / 0 FAIL / 0 BLOCKED
platform: macOS 26.5.2 build 25F84, arm64
```

This checkpoint is discovery evidence. It does not itself promote any public low-level mutation API.

## Observed facts

The non-mutating probe established on the reference Mac:

- one active display was observed;
- current Core Graphics display bounds were `1710 × 1107`;
- the current ScreenCaptureKit probe returned an image whose configured/output dimensions were `1710 × 1107`;
- Quartz global pointer coordinates were finite;
- `CGEvent.location`, `CGEvent.unflippedLocation` and `NSEvent.mouseLocation` exhibited the expected current primary-display coordinate relationship;
- Accessibility trust was already granted;
- Screen Recording preflight was already granted;
- `SCShareableContent` plus `SCScreenshotManager.captureImage` produced a real primary-display frame;
- mouse-move, left/right button, scroll-wheel and keyboard `CGEvent` objects could be constructed;
- 28 on-screen non-desktop windows were visible through the metadata-only window query at that instant.

The display/image dimensions above are evidence for this tested configuration only. They are not exposed as durable native display identity and are not claimed to be physical panel-pixel dimensions.

## Non-mutation boundary

The discovery deliberately did **not** post any synthetic `CGEvent`.

It therefore proves constructibility only, not delivery, targeting, application consequence or semantic success for:

- pointer movement;
- mouse button delivery;
- drag/drop;
- wheel/scroll delivery;
- keyboard delivery.

Those capabilities require separate physical checkpoints before public promotion.

The discovery also did not call `CGRequestScreenCaptureAccess`. Screen capture was attempted only because non-prompting preflight already returned granted. No permission dialog was requested.

The captured image bytes were not committed as evidence and were not printed to the session log. Only availability and dimensions were logged.

## Historical immutable discovery attempts

### s01

```text
session: cc-phase10-low-level-fallback-discovery-s01
evidence: 71925f3613bf6c7b45bb2ea3e973726142ce6e26
result: 39 PASS / 0 FAIL / 1 BLOCKED
```

The physical helper did not run because the macOS 26.5 SDK marks `CGDisplayCreateImage` unavailable and requires ScreenCaptureKit. No discovery mutation or capture occurred.

### s02

```text
session: cc-phase10-low-level-fallback-discovery-s02
evidence: 0680822ec3996d9cfaed78029e2791a8f63c747a
result: 39 PASS / 0 FAIL / 1 BLOCKED
```

The ScreenCaptureKit migration was present, but the Swift helper failed to compile because a `String?` was coalesced directly with `NSNull`. No discovery mutation or capture occurred.

Both blocked checkpoints remain immutable historical evidence. The s03 correction changed only the discovery helper and retained the same product SHA.

## Architectural consequences

The evidence supports splitting Phase 10 rather than creating one generic computer-use primitive:

1. **10A display capture** — non-mutating ScreenCaptureKit primary-display PNG capture;
2. **10B pointer movement/button delivery** — requires real delivery plus independent pointer/button postconditions where observable;
3. **10C drag/drop** — separate compound input semantics and postcondition;
4. **10D wheel/gesture delivery** — separate from existing semantic `ui.scroll` and never preferred over it;
5. **10E keyboard fallback** — separate raw input delivery and never preferred over semantic text/action APIs;
6. window/element capture and OCR/vision remain later scopes and must not be inferred from primary-display capture evidence.

A working semantic capability always takes precedence over these low-level fallbacks.
