# Phase 9B3B directory-action discovery evidence

Status: `DISCOVERY_PHYSICALLY_VALIDATED`

This evidence is diagnostic. It does not promote `filePicker.selectItem` or `filePicker.openDirectory` beyond `IMPLEMENTED`.

## Session

- session: `cc-phase9b3b-directory-actions-discovery-s01`
- evidence commit: `cedecaecd29846c7dacef4b24e5fe1d226b4ef5b`
- product under observation: `6533489586ce51f03296a4191dc0806a88f4c66b`
- test source: `be4f050e5b7ea4882815957a2ff6fb6c3a0bf2df`
- PoC SHA tested: `f750c6e493a47bf3bd481271985d0993826aeb91`
- result: `25 PASS / 0 FAIL / 0 BLOCKED`
- platform: macOS 26.5.2 build 25F84, arm64

## Native Accessibility findings

The discovery was read-only and observed a real Cocoa/AppKit `NSOpenPanel` at location `PickerRoot`.

For visible directory `FolderA`:

- the row is `AXRow` / `AXOutlineRow` and advertises only `AXShowDefaultUI` and `AXShowAlternateUI`;
- the list is `AXOutline` (`ListView`) and advertises only `AXShowMenu`;
- the disclosure triangle advertises only `AXPress`;
- the exact descendant `AXTextField` whose `AXValue` is `FolderA` advertises:
  - `AXConfirm` — description `confirm`;
  - `AXOpen` — description `Open Finder item`;
  - `AXShowMenu` — description `show menu`;
- the picker OK button (`OKButton`, title `Choose`) advertises `AXPress`;
- the sheet advertises `AXRaise`.

The discovery left the picker open at `PickerRoot` and did not deliver any Accessibility action.

## Design consequence

`filePicker.openDirectory` must not target row/list/sheet generically and must not use `AXOpen` for picker navigation merely because it is advertised. The physically observed semantic target is the exact directory-name `AXTextField`, and the navigation-intent action on that element is `AXConfirm`.

The product therefore rebinds the exact visible directory row, locates exactly one descendant text field whose native value equals the requested name and which advertises `AXConfirm`, invokes `AXConfirm` only on that element, and still requires an independent observed picker-location change before success.

No keyboard, double-click synthesis, mouse coordinate targeting, arbitrary filesystem path or picker accept action is introduced by this finding.
