# Phase 9B3C — native file-picker semantic accept/cancel physical evidence

Status: `PHYSICALLY_VALIDATED` on the deterministic macOS Cocoa/AppKit `NSOpenPanel` reference fixture.

## Canonical checkpoint

```text
session: cc-phase9b3c-file-picker-semantic-actions-s03
evidence commit: 9a47234951d3de5dff9d4b975892a8b0b07e079d
validated product: 2be349b1fdf2a6ea08ee893be423942d926a2c0b
test source: 2f107d05bdce5650929db8ead670f12da2f59f54
poc SHA tested: 5cc8e8f97cc8fa139248ff3e6c28612df31aa8a9
result: 29 PASS / 0 FAIL / 0 BLOCKED
macOS: 26.5.2 (25F84), arm64
```

## Physically proved behavior

- `filePicker.accept` targets the one backend-private native `AXButton` identified by the previously discovered AppKit Accessibility identifier `OKButton`.
- `filePicker.cancel` targets the one backend-private native `AXButton` identified by `CancelButton`.
- Neither operation chooses a target from the visible button label.
- Each target must be enabled and advertise native `AXPress`.
- Native action delivery alone is not success.
- After each action, a fresh independent `filePicker.observe` reports `picker:null` while the registered Provider application remains running and active.
- After accept, an independent read-only AX observer records exactly `Picker Result: accepted Alpha.txt`, proving the AppKit completion handler received `.OK` and the selected file.
- After cancel, the same independent observer records exactly `Picker Result: cancelled`, proving the AppKit completion handler received `.cancel`.
- No coordinate, mouse, keyboard, clipboard, synthetic keypress, filesystem mutation/enumeration or label-matching fallback participates in the validated path.
- PIDs, AX elements and the internal `OKButton` / `CancelButton` identifiers remain backend-private.

## Historical checkpoints retained

The final PASS does not rewrite earlier evidence:

- `cc-phase9b3c-file-picker-semantic-actions-s01`, evidence `53239bbb4b1da389e65e24f7dc484bd119b1a31f`: `BLOCKED`; disproved the original assumption that `NSOpenPanel` exposed the semantic action through `AXDefaultButton` on the picker sheet.
- `cc-phase9b3c-file-picker-semantic-actions-s02`, evidence `bc593924b065975dc52227ae6e4f81395c92e35b`: `FAIL`; native accept correctly dismissed the picker, but the test's generic `client.find` completion observer failed to observe the fixture result label.
- `cc-phase9b3c-file-picker-accept-result-diagnostic-s01`, evidence `d37b848c8abdb6d27da7c453627b2edcfbf2a518`: `PASS`; independent read-only AX observation captured `Picker Result: accepted Alpha.txt`, isolating the s02 failure to the test observer.

The canonical s03 checkpoint replaced only the unreliable test observer; the product under validation remained `2be349b1fdf2a6ea08ee893be423942d926a2c0b`.
