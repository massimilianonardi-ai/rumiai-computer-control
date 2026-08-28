# Phase 9D display and clipboard discovery

Status: `PHYSICALLY_VALIDATED_DISCOVERY`.

This document records the authoritative read-only/safe discovery checkpoint used to design Phase 9D. It does not promote any Phase 9D public capability.

## Authoritative session

```text
session: cc-phase9d-display-clipboard-discovery-s01
evidence: c70e0e581c54ee67d9f56c4400ef3a942012629e
validated discovery product: 6e651f4c226e670ea45ed4b0139b3fe0eff8baac
test source: 68c76aa89d838641baac95abff4f89f47ac96d19
poc SHA tested: cb01e84d7e4901448d584c4075a7d28e97bda65b
host OS: macOS 26.5.2 build 25F84, arm64
result: PASS
```

## Display observations

The reference host exposed exactly one active, online, built-in main display named `Built-in Retina Display`.

Observed AppKit/CoreGraphics topology:

```text
logical frame:       x=0 y=0 width=1710 height=1107
visible frame:       x=0 y=56 width=1710 height=1017
backing scale:       2
rotation:            0 degrees
active:              true
online:              true
built-in:            true
main:                true
native display ID:   1
```

The discovery helper also reported `pixelWidth=1710` and `pixelHeight=1107` while AppKit reported `backingScaleFactor=2`. Because this single Retina observation does not establish a portable meaning for the native pixel fields across display modes/platforms, Phase 9D1A must not expose those fields as a canonical physical-pixel contract. The native `CGDirectDisplayID` likewise remains backend-private.

The discovery supports a public read-only display observation surface based on semantic geometry and state: name, logical bounds, usable bounds, scale, rotation, primary/main, built-in, active and online.

## Clipboard observations

The general pasteboard was observed before and after the discovery without reading payload contents. Its `changeCount`, item count and advertised native type identifiers were unchanged:

```text
changeCount: 1493 -> 1493
itemCount:   1 -> 1
generalPasteboardUnchanged: true
```

The observed general pasteboard advertised native types including `public.utf8-plain-text` plus Chromium-private metadata. Those native identifiers are topology evidence, not a public RumiAI clipboard type contract.

Typed payload probing was performed only on an isolated `NSPasteboard.withUniqueName()` owned by the test. Exact write/readback succeeded for:

```text
public.utf8-plain-text
public.html
public.rtf
public.png
```

The isolated pasteboard additionally advertised native conversion/compatibility types such as TIFF and legacy AppKit pasteboard identifiers. Phase 9D richer clipboard design should therefore expose explicit canonical format metadata while keeping native UTI/legacy identifiers backend-private.

## Existing compatibility surface

The product already exposes legacy textual operations:

```text
clipboard.read
clipboard.write
clipboard.copy
clipboard.paste
```

`clipboard.write` performs exact text readback verification. `clipboard.copy` and `clipboard.paste` are keyboard-delivery operations and their delivery must not be reinterpreted as a richer typed-clipboard semantic postcondition.

Any richer clipboard API must extend this surface compatibly rather than silently changing the existing textual contract.

## Scope conclusion

The discovery authorizes implementation work, not physical promotion:

- Phase 9D1A: read-only display observation can be implemented next;
- richer clipboard should remain a separate Phase 9D2 contract so legacy text compatibility and typed payload semantics can be validated independently.
