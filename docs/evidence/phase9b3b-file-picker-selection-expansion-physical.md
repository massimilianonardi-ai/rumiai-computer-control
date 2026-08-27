# Phase 9B3B physical validation — file-picker selection and hierarchical expansion

Status: `PHYSICALLY_VALIDATED` on the deterministic Cocoa/AppKit `NSOpenPanel` reference fixture.

## Immutable session

```text
session: cc-phase9b3b-file-picker-selection-expansion-s01
evidence commit: 36ca5eb400954457f44467d9028e6f26a21e70cd
validated product: 805ec5126f991bd6a19945bfda5d0fc2778ae221
test source: 5e9fb88809af10c07bcf9f109d8d1e51ff92994a
poc SHA tested: 8db375a5b23103f834d04721639400c6d61cbdc5
result: 26 PASS / 0 FAIL / 0 BLOCKED
macOS: 26.5.2 (25F84), arm64
```

The runner observed the exact expected product SHA and exact test-source SHA before physical execution.

## Physically validated behavior

The public Phase 9B3B API surface is:

```text
filePicker.selectItem
filePicker.expandDirectory
```

The session physically proved all of the following on a real AppKit `NSOpenPanel`:

- `filePicker.observe` remained `PHYSICALLY_VALIDATED`;
- both Phase 9B3B capabilities were still `IMPLEMENTED` during the checkpoint;
- obsolete `filePicker.openDirectory` was absent;
- the picker opened at visible location `PickerRoot`;
- `Alpha.txt` was selected through native Accessibility selection semantics;
- an independent fresh observation reported `Alpha.txt` with `selected:true`;
- selecting `Alpha.txt` again was idempotent;
- attempting directory expansion on `Alpha.txt` failed as `FILE_PICKER_ITEM_NOT_DIRECTORY` before directory mutation;
- the failed operation preserved the open picker and `PickerRoot` location;
- `FolderA` was expanded through its native `AXDisclosureTriangle` / `AXPress` semantic path;
- the backend independently verified the directory as expanded through fresh `AXDisclosing=true` observation;
- the picker remained open;
- the visible location remained `PickerRoot`;
- `Nested.txt` became visible through independent `filePicker.observe`;
- expanding `FolderA` again was idempotent and preserved `Nested.txt` visibility;
- no picker accept/cancel occurred;
- no arbitrary filesystem path, filesystem enumeration/mutation, coordinate targeting, keyboard, clipboard, synthetic double-click, `AXConfirm` or `AXOpen` fallback was used.

Terminal marker:

```text
physical-phase9b3b-file-picker-selection-expansion=PASS
```

## Historical correction preserved

Earlier immutable Phase 9B3B sessions are not rewritten. They established that the initial `filePicker.openDirectory` / current-location-change model was incorrect on the reference `NSOpenPanel`. Subsequent disclosure discovery proved the actual native hierarchical behavior, leading to the canonical `filePicker.expandDirectory` contract validated here.

Phase 9B3C may therefore proceed to explicit picker accept/cancel semantics without reopening Phase 9B3B.