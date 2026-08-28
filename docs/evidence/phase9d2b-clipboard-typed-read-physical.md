# Phase 9D2B — typed clipboard read physical evidence

Status: `PHYSICALLY_VALIDATED`

Authoritative session:

- session: `cc-phase9d2b-clipboard-typed-read-s02`
- evidence commit: `ab2745383e7e3051d6d4bb797cd908fb7c5b3f77`
- validated product: `52339ec3c032ef62bae80113336b6588e7135771`
- test source: `8cf666fb16ad364795cb8e534f27ad2d1d2598ae`
- PoC SHA tested: `9b8c0ae3e4a919c9761eaadba7dc6ed2ff4c26d5`
- result: `38 PASS / 0 FAIL / 0 BLOCKED`
- macOS: `26.5.2` build `25F84`, arm64

## What was validated

The session exercised the actual product runtime and TypeScript SDK against an independent `NSPasteboard` oracle. The general pasteboard remained at one stable revision for the checkpoint.

The reference pasteboard exposed one canonical readable target:

```text
itemIndex=0
format=text/plain
```

For that target the checkpoint proved:

- `clipboard.observe` returned the revision-scoped item metadata;
- `client.readClipboardFormat({revision,itemIndex,format})` returned `state=READ`;
- the public base64 representation was canonical;
- decoded public byte count matched the native oracle byte count;
- decoded public bytes matched the independent native oracle digest exactly;
- public observation method and backend strategy were the intended typed-read mechanisms;
- a stale revision was rejected as `CLIPBOARD_REVISION_STALE`;
- an absent item was rejected as `CLIPBOARD_ITEM_NOT_FOUND`;
- a canonical but non-advertised format was rejected as `CLIPBOARD_FORMAT_NOT_AVAILABLE`;
- a final metadata observation confirmed that the general pasteboard revision and item count remained stable;
- legacy `clipboard.read`, `clipboard.write`, `clipboard.copy` and `clipboard.paste` capability states remained unchanged.

The evidence log records format names and PASS/FAIL state only. It does not persist the clipboard payload, its base64 representation, or its digest.

## Coverage boundary

This physical session validates the complete typed-read mechanism on the real macOS general-pasteboard surface, with end-to-end payload coverage for `text/plain` because that was the only canonical format advertised during the session.

It does **not** claim an end-to-end physical payload sample for `text/html`, `text/rtf` or `image/png`. Those canonical branches are implemented and contract-tested, and the earlier Phase 9D isolated discovery proved native byte round trips for those representations, but additional real-pasteboard conformance sessions are required before claiming equivalent end-to-end coverage for each format.

## Historical s01

Session `cc-phase9d2b-clipboard-typed-read-s01` is preserved as immutable evidence at commit `835bbbbb8f90cd6fe50150077efab87a4e8694c6` with `37 PASS / 1 FAIL / 0 BLOCKED`.

Its dedicated physical typed-read test already passed. The only failure was the historical Phase 9D discovery contract guard, which still forbade the newly introduced canonical `clipboard.readFormat` method. The forward-only s02 test-source correction updated only that stale guard and tested the identical product SHA.

## Promotion rule

This evidence promotes `clipboard.readFormat` from `IMPLEMENTED` to `PHYSICALLY_VALIDATED` for the tested macOS typed-read path. Physical validation remains scoped to the tested backend and format coverage described above; it is not a universal claim about every pasteboard producer or representation.