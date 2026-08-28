# Clipboard API

Computer Control preserves the existing text clipboard contract and extends richer clipboard support in separate phases. Phase 9D2A adds metadata-only observation; it does not read a clipboard payload and does not mutate the general pasteboard.

## Existing text contract

The pre-existing APIs remain unchanged:

```js
client.readClipboard()
client.writeClipboard(text)
client.copy()
client.paste()
```

Their semantics remain distinct:

- `clipboard.read` reads the existing text representation;
- `clipboard.write` writes text and verifies exact text readback;
- `clipboard.copy` is keyboard-copy delivery;
- `clipboard.paste` is keyboard-paste delivery.

Phase 9D does not silently reinterpret or replace those methods.

## Phase 9D2A — clipboard metadata observation

Public SDK:

```js
client.observeClipboard()
```

RPC:

```text
clipboard.observe
```

Parameters:

```json
{}
```

Result shape:

```json
{
  "state": "OBSERVED",
  "revision": "1493",
  "items": [
    {
      "index": 0,
      "formats": ["text/plain"],
      "unsupportedFormatCount": 2
    }
  ],
  "observation": {"method": "macos-native-clipboard-metadata-observation"},
  "backend": {"name": "macos-ax", "strategy": "os-owned-native-clipboard-metadata-observation"}
}
```

### Public semantics

`revision` is an opaque observation revision. On the macOS backend it is derived from `NSPasteboard.changeCount`, but callers must not interpret it numerically or persist it as durable clipboard identity. It exists so a later typed-read contract can reject a request if the clipboard changed after metadata observation.

`items` preserves current pasteboard item order. Each `index` is observation-scoped and meaningful only together with the returned `revision`.

`formats` contains only canonical formats currently admitted by the richer clipboard contract:

```text
text/plain
text/html
text/rtf
image/png
```

Native aliases and platform type identifiers are backend-private. Multiple native aliases may map to one canonical format.

`unsupportedFormatCount` reports how many native type identifiers for that item were not mapped to the canonical set. It deliberately does not expose their names. This prevents private/application-specific UTIs such as Chromium metadata types from becoming public Computer Control contract vocabulary.

### Privacy and race boundary

Phase 9D2A observes metadata only.

The macOS helper may read:

- `NSPasteboard.changeCount`;
- item count/order;
- each item's advertised type identifiers for backend-private canonicalization.

It does **not** call payload-reading APIs such as `string(forType:)`, `data(forType:)` or equivalent data access. It does not log clipboard text, HTML, RTF, image bytes or private native type names.

The helper reads the pasteboard revision before and after metadata enumeration. If it changes during the observation, the operation fails with `CLIPBOARD_CHANGED_DURING_OBSERVATION` rather than returning metadata assembled across two clipboard states.

Observation performs no `clearContents`, declaration, write, copy/paste key delivery, mouse/keyboard input or clipboard restoration.

### Validation state

Phase 9D2A validation state: `PHYSICALLY_VALIDATED`.

Authoritative public checkpoint:

```text
session: cc-phase9d2a-clipboard-metadata-observation-s03
evidence: 521f41c2fcc499574b61b658440671faefe61708
validated product: bbf6579a2d291d16cde02c3371e5b31495a92287
test source: af5fcf98cfc770302cd1e34c011d46fdeca5adc3
poc SHA tested: 58b72853eb65b51e6fda28de52fec152a5a834c0
result: 37 PASS / 0 FAIL / 0 BLOCKED
```

The checkpoint compared the public runtime/SDK operation with an independent native `NSPasteboard` metadata oracle under one stable revision. It verified repeated observation, exact canonical metadata, native-type privacy and the absence of payload content in the public result. See `docs/evidence/phase9d2a-clipboard-metadata-observation-physical.md`.

Historical `s02` evidence remains immutable with overall `FAIL`: the product and oracle metadata were already semantically equal, but that test compared JSON strings whose property insertion order differed. The forward-only s03 correction changed only the test comparison.

The design was originally grounded in the authoritative Phase 9D discovery:

```text
session: cc-phase9d-display-clipboard-discovery-s01
evidence: c70e0e581c54ee67d9f56c4400ef3a942012629e
product observed: 6e651f4c226e670ea45ed4b0139b3fe0eff8baac
test source: 68c76aa89d838641baac95abff4f89f47ac96d19
poc SHA tested: cb01e84d7e4901448d584c4075a7d28e97bda65b
result: PASS
```

That discovery proved that general-pasteboard metadata can be observed without modifying the user's clipboard, and separately proved exact isolated-pasteboard round-trips for plain text, HTML, RTF and PNG.

## Phase 9D2B — typed payload read

Typed payload access is a separate capability from metadata observation. Its public request is intentionally revision-scoped: the caller must supply the opaque `revision` returned by `clipboard.observe`, an `itemIndex`, and one canonical `format` advertised for that item. A changed revision, missing item or non-advertised format must fail explicitly rather than reading a different clipboard state.

The typed-read contract is implemented and physically validated separately; Phase 9D2A evidence does not promote payload access.

## Phase 9D2C — typed write

Typed write is a further separate mutation phase and requires independently observed readback/postcondition semantics. It must not weaken or reinterpret the existing text-only `clipboard.write` contract.
