# Display capture API

Phase 10A introduces the first explicit low-level fallback capability after the Phase 10 physical discovery.

Public SDK:

```js
client.captureDisplay({display:"primary"})
```

RPC:

```text
display.capture
```

Request:

```json
{
  "display": "primary"
}
```

## Scope

The initial contract captures only the display that is **primary at capture time**.

No `CGDirectDisplayID`, ScreenCaptureKit display ID, `NSScreenNumber`, coordinate-derived identity or array index crosses the public boundary. Multi-display selection is not inferred from `display.list` ordering.

The output format is fixed to lossless PNG at this phase. The cursor is explicitly excluded.

## Result

```json
{
  "state": "CAPTURED",
  "display": "primary",
  "format": "image/png",
  "width": 1710,
  "height": 1107,
  "byteCount": 123456,
  "dataBase64": "...",
  "cursorIncluded": false,
  "observation": {
    "method": "macos-screencapturekit-primary-display-png"
  },
  "backend": {
    "name": "macos-screencapturekit",
    "strategy": "primary-display-single-frame-png"
  }
}
```

`width` and `height` describe the pixel dimensions of the returned PNG image. They are **not** a claim about physical panel pixels and do not redefine the logical display geometry exposed by `display.list`.

`dataBase64` is canonical base64 for the complete PNG payload. The backend independently verifies decoded byte count, canonical base64 round-trip and the PNG signature before returning success.

The encoded PNG is limited to **20 MiB**. This keeps its base64 JSON representation inside the current 32 MiB helper/client transport budget. An oversized image fails explicitly instead of being truncated.

## Permission behavior

The macOS implementation uses ScreenCaptureKit.

Before attempting capture it calls non-prompting screen-capture preflight. If Screen Recording permission is not already available, the operation fails as:

```text
SCREEN_CAPTURE_PERMISSION_REQUIRED
```

with state `BLOCKED`.

Computer Control does **not** automatically request Screen Recording permission from this API. Permission acquisition remains explicit user/system setup rather than a side effect of an observation call.

## Privacy and persistence boundary

A successful call intentionally reads visible screen pixels and returns them to the caller. Screen contents can contain sensitive information, so callers should invoke capture only when visual access is part of the requested task or policy permits it.

The native helper does not write an image file. Computer Control does not persist the returned screenshot as part of the capture operation and does not log `dataBase64` or image bytes.

The ScreenCaptureKit/CoreGraphics identifiers used to select the current primary display remain backend-private.

## Fallback semantics

`display.capture` belongs to the explicit Phase 10 fallback layer.

It must not replace a working semantic observation API when structured native state already answers the task. A screenshot is a representation of the screen, not semantic proof of application state.

Image interpretation, OCR and vision are separate concerns. Phase 10A returns the PNG only; it does not claim OCR, element recognition, click targeting or semantic consequence verification.

## Validation state

Phase 10A state: `IMPLEMENTED`.

The underlying ScreenCaptureKit primitive was physically discovered in:

```text
session: cc-phase10-low-level-fallback-discovery-s03
evidence: ae385e0746d58bcf4c1c41ba6a8641fa8d258fc5
observed product: 82c7ac2cd1d842d50db5a27339a563e2cec919c6
test source: 5a580668bf3e0edad1749f0c9c814b471599c9e6
poc SHA tested: 15f333ca0eb00972c120d9cd0cb7ca86ea49fd0e
result: 40 PASS / 0 FAIL / 0 BLOCKED
```

That discovery proves the native capture primitive on the reference Mac but does **not** by itself physically validate this new public runtime/SDK contract. A dedicated Phase 10A session is required before promotion to `PHYSICALLY_VALIDATED`.

See `docs/evidence/phase10-low-level-fallback-discovery-physical.md`.
