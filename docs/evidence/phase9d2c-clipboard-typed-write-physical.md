# Phase 9D2C — typed clipboard write physical validation

Status: `PHYSICALLY_VALIDATED`

## Authoritative checkpoint

```text
session: cc-phase9d2c-clipboard-typed-write-s01
evidence: 358e22bca3b18bb835e91ae05fece1b3a757b722
validated product: a3bcb2cc9f9f374958b6816c32be06cb6c12908a
test source: 57d4d002d1ecaf1cb673eaa144dbd883502c2e93
poc SHA tested: c13b070ee2839ae6f22aa1d22e5a8c8933794505
result: 39 PASS / 0 FAIL / 0 BLOCKED
platform: macOS 26.5.2 build 25F84 arm64
```

The physical checkpoint validated the public `clipboard.writeFormat` runtime/SDK path against the macOS general pasteboard while preserving the pre-existing user clipboard through an independently implemented in-memory restoration guardian.

## Safety prerequisite

Before the public mutation checkpoint, restoration safety was validated separately:

```text
session: cc-phase9d2c-clipboard-restoration-discovery-s02
evidence: c9806844aecb3bde47f72ee37e2e731c8d6e6c99
validated product: a3bcb2cc9f9f374958b6816c32be06cb6c12908a
test source: e52d68324f6ec8bdd822d85aa9cc2cfe052c332b
poc SHA tested: 0e4547095222a17b39304fbc4d19a3f57b2ecc07
result: 39 PASS / 0 FAIL / 0 BLOCKED
```

That discovery proved that the then-current general pasteboard could be fully materialized in memory, temporarily replaced with test-owned data, and restored item/type/data-byte exactly without logging payloads or native type names.

Historical restoration discovery s01 evidence `8cd5e5211753b40e54d14681a197b4525b6df1c4` remains immutable with `38 PASS / 0 FAIL / 1 BLOCKED`; it stopped at oracle compilation before any pasteboard mutation. The forward-only s02 correction changed only the Swift `Result` failure type.

## Public typed-write coverage

The authoritative s01 checkpoint invoked the real public SDK method:

```js
client.writeClipboardFormat({format, dataBase64})
```

for every admitted canonical format:

```text
text/plain   45 bytes
text/html    66 bytes
text/rtf     42 bytes
image/png    68 bytes
```

For each format the checkpoint required all of the following:

1. public result `state="WRITTEN"` and `verified=true`;
2. exact returned `byteCount`;
3. mutation semantics `changed=true`, `idempotent=false`;
4. product postcondition `verification.method="native-typed-readback-exact"`;
5. semantic backend identity `macos-ax` / `os-owned-native-clipboard-typed-write`;
6. no `dataBase64` or payload echo in the public write result;
7. byte-exact independent AppKit readback through a test-owned guardian implementation;
8. independent guardian revision equal to the product-reported revision;
9. fresh public `clipboard.observe` reporting the written canonical format under the same revision;
10. fresh public `clipboard.readFormat` returning byte-identical content.

All four format paths passed.

## Delivery is not success

The macOS native writer reports delivery metadata only. Product success is not derived from delivery. After native delivery, Computer Control performs a separate typed native read through the read helper and requires exact equality of revision, item index, canonical format, byte count and base64 payload before returning `verified=true`.

The physical checkpoint additionally used an independent AppKit guardian, separate from the product writer/readback helpers, to verify the same bytes.

## Clipboard preservation

At public-checkpoint start the guardian fully materialized the current general pasteboard in memory:

```text
itemCount=1
typeCount=3
byteCount=459
```

After all four public typed writes, the guardian restored the original pasteboard and independently verified exact item/type/data equality. The final logged restoration summary was:

```text
itemCount=1
typeCount=3
byteCount=459
```

The checkpoint recorded:

```text
phase9d2c-original-clipboard-restored=PASS
phase9d2c-restoration-required=PASS
```

## Privacy boundary

Neither user clipboard payload nor test payload is written to committed evidence. The checkpoint explicitly records:

```text
userPayload=false
testPayload=false
base64=false
digest=false
nativeTypeNames=false
```

Native pasteboard type identifiers remain backend/test-private and are not promoted into the Computer Control public contract.

## Scope

This checkpoint physically validates the four current canonical typed-write formats on the tested macOS `NSPasteboard.general` surface and validates the public runtime/SDK postcondition semantics. It does not imply support for arbitrary native pasteboard types, multi-item typed-write composition, append/merge semantics, or clipboard-manager history semantics.

The existing text-only `clipboard.write`, `clipboard.read`, keyboard-delivery `clipboard.copy` and `clipboard.paste` contracts remain separate and unchanged.
