# Phase 9D2A — Clipboard metadata observation physical validation

## Authoritative checkpoint

```text
session: cc-phase9d2a-clipboard-metadata-observation-s03
evidence commit: 521f41c2fcc499574b61b658440671faefe61708
validated product: bbf6579a2d291d16cde02c3371e5b31495a92287
test source: af5fcf98cfc770302cd1e34c011d46fdeca5adc3
PoC SHA tested: 58b72853eb65b51e6fda28de52fec152a5a834c0
result: 37 PASS / 0 FAIL / 0 BLOCKED
```

Reference host:

```text
macOS 26.5.2
build 25F84
Darwin 25.5.0
arm64
Node v26.7.0
Apple Swift 6.3.3
agent-ctrl 0.1.4
```

## What was physically validated

The dedicated Phase 9D2A checkpoint exercised the public runtime and SDK `clipboard.observe` operation against an independent native `NSPasteboard` metadata oracle.

On the observed reference state both sides reported the same stable opaque revision (`1509`) and one pasteboard item with:

```json
{
  "index": 0,
  "formats": ["text/plain"],
  "unsupportedFormatCount": 2
}
```

The oracle, the first public observation, the second public observation and the final oracle observation all remained on the same revision. The public canonical metadata matched the independent oracle exactly after structural normalization.

The checkpoint also verified that the public result does not expose native pasteboard type identifiers, Chromium/private native type names, payload bytes/text or base64 data. The public method and backend strategy were exactly:

```text
observation.method = macos-native-clipboard-metadata-observation
backend.strategy   = os-owned-native-clipboard-metadata-observation
```

The pre-existing text clipboard/copy/paste capabilities remained present at their existing physical-validation states.

## Privacy and safety boundary

This checkpoint did not read or log clipboard payload content. It inspected only pasteboard revision, item order/count and advertised native type identifiers for backend-private canonicalization. It did not mutate the general pasteboard.

The public contract remains limited to:

```text
revision
items[].index
items[].formats
items[].unsupportedFormatCount
```

with the admitted canonical format vocabulary:

```text
text/plain
text/html
text/rtf
image/png
```

Native type identity remains backend-private.

## Immutable historical evidence

`cc-phase9d2a-clipboard-metadata-observation-s02` remains preserved as a historical FAIL with evidence commit `fadb856d43418f383e273bd50794ba37fb568ba7`. Its product and oracle data were semantically equal and the pasteboard revision remained stable, but the physical test compared `JSON.stringify()` output whose object property insertion order differed. The forward-only s03 correction normalized the semantic item shape before comparison and changed no product file.

The earlier prepared s01 session was never executed because an over-broad schema substring guard was found before physical execution. Its preparation history also remains preserved.

## Promotion

Only the read-only `clipboard.observe` capability is promoted to `PHYSICALLY_VALIDATED` by this checkpoint. Typed payload reads and typed writes remain separate later phases and receive no validation credit from this evidence.
