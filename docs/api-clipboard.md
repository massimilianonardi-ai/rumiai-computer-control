# Clipboard API

Computer Control preserves the existing text clipboard contract and extends richer clipboard support in separate phases. Phase 9D2A adds metadata-only observation; Phase 9D2B adds explicit revision-scoped typed payload reads; Phase 9D2C adds explicit typed replacement with exact native readback verification.

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

## Canonical richer-clipboard formats

The richer clipboard vocabulary is deliberately closed at this phase:

```text
text/plain
text/html
text/rtf
image/png
```

Native aliases and platform type identifiers remain backend-private. Multiple native aliases may map to one canonical format.

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
  "revision": "1509",
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

`revision` is an opaque observation revision. On the macOS backend it is derived from `NSPasteboard.changeCount`, but callers must not interpret it numerically or persist it as durable clipboard identity.

`items` preserves current pasteboard item order. Each `index` is observation-scoped and meaningful only together with the returned `revision`.

`formats` contains only the admitted canonical formats.

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

Public SDK:

```js
client.readClipboardFormat({revision, itemIndex, format})
```

RPC:

```text
clipboard.readFormat
```

Parameters:

```json
{
  "revision": "1509",
  "itemIndex": 0,
  "format": "text/plain"
}
```

Result shape:

```json
{
  "state": "READ",
  "revision": "1509",
  "itemIndex": 0,
  "format": "text/plain",
  "byteCount": 12,
  "dataBase64": "ZXhhbXBsZSB0ZXh0",
  "observation": {"method": "macos-native-clipboard-typed-read"},
  "backend": {"name": "macos-ax", "strategy": "os-owned-native-clipboard-typed-read"}
}
```

### Addressing and stale-state semantics

A typed read is valid only against an explicit metadata observation:

1. call `clipboard.observe`;
2. choose one returned `items[].index` and one format that item advertised;
3. pass the same opaque `revision`, item index and canonical format to `clipboard.readFormat`.

The API does not accept a native pasteboard type name, UTI, object handle or durable clipboard item ID.

The macOS helper compares the current `NSPasteboard.changeCount` with the requested opaque revision **before** payload access. A mismatch fails with `CLIPBOARD_REVISION_STALE`.

After the payload is read, it verifies the revision a second time. A change during payload access fails with `CLIPBOARD_CHANGED_DURING_READ`. In either stale case the operation does not report success for a payload from a different clipboard state.

A missing item fails as `CLIPBOARD_ITEM_NOT_FOUND`. A canonical format not actually advertised for that item fails as `CLIPBOARD_FORMAT_NOT_AVAILABLE`.

### Payload representation

`dataBase64` is the exact native payload bytes encoded as canonical base64. Computer Control does not parse, rewrite or normalize HTML, RTF or PNG content. This keeps the typed transport lossless and avoids inventing charset or document semantics.

`byteCount` is the exact decoded byte count and is independently checked by the JavaScript backend together with canonical base64 round-trip validation.

The raw payload limit is **16 MiB** (`16,777,216` bytes). A larger payload fails with `CLIPBOARD_PAYLOAD_TOO_LARGE`. The limit keeps the base64 JSON response within the runtime's 32 MiB process/transport buffer budget.

For ordinary text-only use, the existing `clipboard.read` remains available and is not redefined by this richer API.

### Content/privacy boundary

Unlike metadata-only `clipboard.observe`, `clipboard.readFormat` intentionally reads clipboard content. Callers should invoke it only when payload access is part of the requested task or policy permits it.

The native helper never exposes the selected native type identifier in the public response. Diagnostics contain timing/helper state only; they do not duplicate the payload.

The operation is read-only with respect to the pasteboard: it does not call `clearContents`, declare or write types, synthesize copy/paste input or restore/replace clipboard content.

### Validation state

Phase 9D2B validation state: `PHYSICALLY_VALIDATED`.

Authoritative checkpoint:

```text
session: cc-phase9d2b-clipboard-typed-read-s02
evidence: ab2745383e7e3051d6d4bb797cd908fb7c5b3f77
validated product: 52339ec3c032ef62bae80113336b6588e7135771
test source: 8cf666fb16ad364795cb8e534f27ad2d1d2598ae
poc SHA tested: 9b8c0ae3e4a919c9761eaadba7dc6ed2ff4c26d5
result: 38 PASS / 0 FAIL / 0 BLOCKED
```

The session used the actual runtime and SDK against an independent `NSPasteboard` oracle. The live pasteboard advertised one canonical target, `itemIndex=0 / text/plain`; exact byte identity was proved without logging payload, base64 or digest. Stale revision, missing-item and non-advertised-format failures were also exercised, and the final pasteboard revision remained stable.

This promotes the typed-read path while keeping the format coverage precise: `text/plain` has end-to-end real-pasteboard payload evidence from this checkpoint. `text/html`, `text/rtf` and `image/png` remain implemented/contract-tested canonical branches with isolated native discovery evidence, but require additional real-pasteboard samples for equivalent per-format conformance claims. See `docs/evidence/phase9d2b-clipboard-typed-read-physical.md`.

Historical s01 evidence `835bbbbb8f90cd6fe50150077efab87a4e8694c6` remains immutable with `37 PASS / 1 FAIL / 0 BLOCKED`: its dedicated physical typed-read test already passed; only the historical Phase 9D discovery guard still forbade the newly introduced canonical method.

## Phase 9D2C — typed write

Public SDK:

```js
client.writeClipboardFormat({format, dataBase64})
```

RPC:

```text
clipboard.writeFormat
```

Parameters:

```json
{
  "format": "text/plain",
  "dataBase64": "UnVtaUFJ"
}
```

### Mutation semantics

`clipboard.writeFormat` is an explicit mutation. It replaces the current general pasteboard contents with one newly written item containing the requested canonical representation.

The public contract intentionally makes no promise that macOS will expose **only** one native type identifier afterwards. AppKit/pasteboard services may synthesize or advertise compatible representations. Computer Control guarantees the requested canonical representation and exact requested bytes, not the absence of platform-generated compatibility types.

The operation always represents an explicit write request, so a successful result reports:

```text
changed=true
idempotent=false
```

Computer Control does not attempt a pre-write equality optimization because that would require additional reads of existing clipboard content and would weaken the simple replacement contract.

### Verification semantics

Delivery is not success.

The native writer:

1. decodes canonical base64;
2. rejects payloads larger than 16 MiB;
3. records the previous pasteboard revision;
4. clears the general pasteboard;
5. writes the requested native representation;
6. requires the pasteboard revision to change;
7. requires exactly one pasteboard item and the requested representation to be advertised.

That delivery result is still not sufficient for semantic success. The JavaScript backend then starts the separate typed-read helper with the **new** revision, `itemIndex=0` and requested canonical format. Success requires exact equality of revision, item index, format, byte count and canonical base64 bytes.

The public verification method is:

```text
native-typed-readback-exact
```

If the clipboard changes between delivery and readback, the typed-read helper fails on its revision guard and the write is not reported as verified even though mutation may already have occurred. This preserves `delivery != success`.

### Transport and privacy boundary

The write helper receives its request through JSON on **stdin**, not command-line arguments. This avoids OS argument-length limits for large base64 payloads and avoids exposing the payload in process arguments.

The write result does not echo `dataBase64` or other payload bytes. It returns only revision, canonical format, byte count and verification metadata.

No keyboard shortcut, mouse action, AppleScript, `pbcopy` or guessed native type identifier is part of this API.

### Result shape

```json
{
  "state": "WRITTEN",
  "verified": true,
  "revision": "1514",
  "itemIndex": 0,
  "format": "text/plain",
  "byteCount": 6,
  "changed": true,
  "idempotent": false,
  "verification": {
    "method": "native-typed-readback-exact",
    "evidence": {
      "revision": "1514",
      "itemIndex": 0,
      "format": "text/plain",
      "byteCount": 6
    }
  },
  "backend": {
    "name": "macos-ax",
    "strategy": "os-owned-native-clipboard-typed-write",
    "fallback": false
  }
}
```

### Validation state

Phase 9D2C validation state: `IMPLEMENTED`.

It must not be promoted until a physical session validates real general-pasteboard mutation plus an independent native postcondition. Because the physical test necessarily mutates the user's clipboard, the session must use explicit test-owned payloads and must define restoration behavior separately rather than pretending a mutation test is read-only.

The existing text-only `clipboard.write` remains unchanged and independently `PHYSICALLY_VALIDATED`.
