# Phase 9D1A display observation — physical validation

## Authoritative checkpoint

Phase 9D1A `display.list` / `client.listDisplays()` is physically validated on the current macOS reference topology by the immutable Computer Control session below.

```text
session: cc-phase9d1a-display-observation-s01
evidence commit: a7788371d7b6d446e783a714112643ba093f2814
validated product: 25c9052c514926f783d6c315cad2e14a5fa55311
test source: a7bd10dc6d522014e1c262a5691ad93c2f5245dd
poc SHA tested: 5d67cd4f3f10c05c31e590698a94809a328a49f4
result: 36 PASS / 0 FAIL / 0 BLOCKED
```

Host:

```text
macOS 26.5.2
build 25F84
architecture arm64
```

## What the physical checkpoint proves

The dedicated physical test compiled and ran an independent AppKit/CoreGraphics oracle separate from the product helper, then started the real Computer Control runtime and called the public TypeScript SDK.

On the reference host both observations independently produced the same semantic display vector:

```json
[
  {
    "name": "Built-in Retina Display",
    "bounds": {"x": 0, "y": 0, "width": 1710, "height": 1107},
    "usableBounds": {"x": 0, "y": 56, "width": 1710, "height": 1017},
    "scale": 2,
    "rotationDegrees": 0,
    "primary": true,
    "builtIn": true,
    "active": true,
    "online": true
  }
]
```

The session explicitly recorded:

- exact independent oracle/public semantic equality;
- a successful repeated `display.list` observation;
- stability of the repeated semantic vector;
- observation method `macos-native-display-observation`;
- backend `macos-ax` with strategy `os-owned-native-display-observation`;
- the full structure and contract suite remaining green.

## Native/public boundary

The public result intentionally omits native display identity and backend-only representation details, including:

- `CGDirectDisplayID` / `displayID`;
- `NSScreenNumber` and equivalent platform handles;
- `pixelWidth` / `pixelHeight` claims not established as portable physical-pixel dimensions by discovery;
- pointer coordinates as an action contract;
- screenshot or display-configuration operations.

Array order is observation order only and is not durable display identity.

## Validation scope

This checkpoint physically exercises the current reference topology: one built-in Retina display. It validates the public observation mechanics and semantic/native boundary on that topology.

It does **not** claim that every possible multi-monitor arrangement, external display, rotation, mirroring configuration or hot-plug transition has been physically exercised. Those are additional conformance surfaces for the same contract and can be added without reopening this validated single-display checkpoint unless new evidence reveals a contract defect.

## Historical discovery provenance

The public contract was designed from the prior read-only Phase 9D discovery:

```text
session: cc-phase9d-display-clipboard-discovery-s01
evidence: c70e0e581c54ee67d9f56c4400ef3a942012629e
product observed: 6e651f4c226e670ea45ed4b0139b3fe0eff8baac
test source: 68c76aa89d838641baac95abff4f89f47ac96d19
poc SHA tested: cb01e84d7e4901448d584c4075a7d28e97bda65b
result: PASS
```

That discovery remains immutable provenance; the later `a7788371...` session is the authoritative physical validation of the public Phase 9D1A API.

Phase 9D1A is therefore `PHYSICALLY_VALIDATED` on the tested macOS reference topology.
