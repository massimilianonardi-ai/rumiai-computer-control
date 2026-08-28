# Phase 10A — display capture physical evidence

## Authoritative checkpoint

```text
session: cc-phase10a-display-capture-s03
evidence: 4d215cace1cf30fa5837852e17dcb273f8e969c3
validated product: ec3cd5f07defacdbe8b634a61b99d5510f77d832
test source: 2375e53952ef72afd32c61a5d79e9b97d374f88c
poc SHA tested: ebc1a4ef9bdeebabf4e359353b5c312f9e015a11
result: PASS
platform: macOS 26.5.2 build 25F84, arm64
```

This is the authoritative Phase 10A public runtime/SDK validation checkpoint.

## What was physically validated

The session exercised the public `display.capture` path through the TypeScript SDK:

```js
client.captureDisplay({display:"primary"})
```

The returned public result was observed as:

```text
state: CAPTURED
display: primary
format: image/png
width: 1710
height: 1107
byteCount: 1025899
cursorIncluded: false
backend: macos-screencapturekit
strategy: primary-display-single-frame-png
observation: macos-screencapturekit-primary-display-png
```

The physical harness verified in memory that:

- the returned base64 was canonical;
- the decoded byte count was exactly `1025899`;
- the PNG signature was valid;
- an independent AppKit PNG decoder reported `1710 × 1107`;
- independent CoreGraphics primary-display dimensions were `1710 × 1107`;
- a separate independent ScreenCaptureKit capture produced `1710 × 1107`;
- no native display identifier crossed the public result boundary;
- screenshot payload/base64 was not logged;
- the screenshot was not persisted by the product or physical harness.

The two ScreenCaptureKit frames were intentionally not compared byte-for-byte because visible screen content may legitimately change between consecutive captures.

## Validation boundary

This checkpoint physically validates the public primary-display PNG capture path on the current macOS reference surface.

It does **not** validate:

- secondary or explicit multi-display selection;
- physical panel-pixel identity;
- cursor-included capture;
- window or region capture;
- OCR or vision interpretation;
- visual element targeting;
- pointer, mouse-button, wheel or keyboard delivery;
- semantic application-state success inferred from pixels.

`display.capture` remains an explicit low-level fallback. Structured semantic observation remains preferred whenever it can answer the task directly.

## Privacy boundary

The test necessarily read the currently visible screen because that is the capability under validation. Screenshot bytes remained in memory only. The evidence records dimensions and byte count, not image bytes, base64 or digest.

No Screen Recording permission request was triggered by the API. The physical checkpoint used the already-authorized reference environment.

## Immutable history

Earlier Phase 10A sessions remain authoritative historical evidence of their own outcomes:

```text
s01 evidence: 1f42dd6646f9602de2b49d13a7b9c16adfc33f13
result: FAIL
reason: stale PoC guards plus oracle compile BLOCKED before public capture

s02 evidence: a1f9561eb8d65d45b90c980d58b2857da50b2a23
result: FAIL
reason: product Swift helper compile command lacked -parse-as-library
```

The product compile defect found by s02 was corrected in `ec3cd5f07defacdbe8b634a61b99d5510f77d832`; s03 then validated that corrected product without changing the public contract.
