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

Phase 9D2A validation state: `IMPLEMENTED`.

The design is grounded in the authoritative Phase 9D discovery:

```text
session: cc-phase9d-display-clipboard-discovery-s01
evidence: c70e0e581c54ee67d9f56c4400ef3a942012629e
product observed: 6e651f4c226e670ea45ed4b0139b3fe0eff8baac
test source: 68c76aa89d838641baac95abff4f89f47ac96d19
poc SHA tested: cb01e84d7e4901448d584c4075a7d28e97bda65b
result: PASS
```

That discovery proved that general-pasteboard metadata can be observed without modifying the user's clipboard, and separately proved exact isolated-pasteboard round-trips for plain text, HTML, RTF and PNG. It did not physically validate this new public `clipboard.observe` API.

Promotion to `PHYSICALLY_VALIDATED` requires a dedicated runtime/SDK checkpoint against an independent metadata oracle. The checkpoint must not read or log the user's clipboard payload.

## Planned richer clipboard continuation

Typed payload access remains separate from Phase 9D2A.

A later read capability should require the observed `revision`, `item index` and canonical `format`, and must fail stale if the clipboard revision changed. Binary/text payload representation, size limits and physical validation scope will be fixed before that API is introduced.

Typed write is a further separate mutation phase and will require independently observed readback/postcondition semantics. It must not weaken the existing text-only `clipboard.write` contract.
