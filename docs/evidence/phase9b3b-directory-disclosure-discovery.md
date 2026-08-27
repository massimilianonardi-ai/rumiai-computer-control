# Phase 9B3B — native file-picker directory disclosure discovery

Status: `DISCOVERY_VALIDATED`

Physical session:

```text
session: cc-phase9b3b-directory-disclosure-discovery-s01
evidence commit: 48ead70cf79cf05827cc5dcde9e7d7fda31363b3
validated product snapshot: 16e4f1b427170b0e5c729a10629990d48ee71daf
test source: b79a7d091970ba97bccfeeb06e972fdd3c4ccd90
result: 26 PASS / 0 FAIL / 0 BLOCKED
macOS: 26.5.2 (25F84)
```

## Physical findings

A real AppKit `NSOpenPanel` in outline/list presentation exposed directory hierarchy through native Accessibility disclosure semantics:

- `FolderA` was an `AXRow` / `AXOutlineRow`;
- its disclosure control was an `AXDisclosureTriangle` with backend-private identifier `NSOutlineViewDisclosureButtonKey`;
- the disclosure triangle advertised `AXPress`;
- before the action, the row reported `AXDisclosing=false`;
- `AXPress` returned success (`0`);
- after the action, a fresh AX rebind reported `AXDisclosing=true`;
- `Nested.txt` became visible in the picker AX tree;
- the independently validated public `filePicker.observe` API also observed `Nested.txt`;
- the picker remained open;
- the visible picker location remained `PickerRoot`.

Therefore hierarchy expansion is not equivalent to changing the picker current-location control. The unvalidated `filePicker.openDirectory` model and its location-change postcondition were rejected before promotion.

## Resulting Phase 9B3B model

Directory hierarchy navigation is represented as explicit expansion:

```text
filePicker.expandDirectory
  -> exact visible directory row
  -> AXDisclosureTriangle
  -> advertised AXPress
  -> independent fresh AXDisclosing observation
```

No `AXConfirm`, `AXOpen`, keyboard, mouse coordinates, double-click synthesis, clipboard, or filesystem enumeration is used as a fallback.

The discovery itself does not promote Phase 9B3B. Physical promotion still requires the public product API checkpoint.
