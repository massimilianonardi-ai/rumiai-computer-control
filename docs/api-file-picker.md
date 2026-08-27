# Native file-picker API

Phase 9B3A provides read-only observation of a native file picker. Phase 9B3B adds native item selection and directory navigation while keeping picker dismissal separate for Phase 9B3C.

## `filePicker.observe`

```js
const result = await client.observeFilePicker({
  application: "Example App"
});
```

The application must resolve through an existing registered application Provider and must already be running. The operation does not launch or activate the application.

When no native picker is present:

```json
{
  "state": "OBSERVED",
  "picker": null
}
```

When one supported native picker is present:

```json
{
  "state": "OBSERVED",
  "picker": {
    "kind": "open",
    "location": "Documents",
    "items": [
      {"name": "Example.txt", "kind": "file", "selected": false, "enabled": true},
      {"name": "FolderA", "kind": "directory", "selected": false, "enabled": true}
    ]
  }
}
```

Observation contract:

- Provider-scoped and read-only;
- no implicit launch or activation;
- `picker:null` is the normal observed state when no picker is open;
- more than one simultaneously observed supported picker fails explicitly as ambiguous;
- `location` is the visible native location label, not a reconstructed or inferred absolute filesystem path;
- visible entries expose only semantic `name`, `kind`, `selected` and `enabled` state;
- unavailable boolean state remains `null` rather than guessed;
- no filesystem enumeration is used to supplement or replace the Accessibility observation;
- PIDs, AX objects, native identifiers, coordinates and process topology never cross the public contract.

Phase 9B3A validation state: `PHYSICALLY_VALIDATED` on the deterministic Cocoa/AppKit `NSOpenPanel` reference fixture.

## `filePicker.selectItem`

```js
const result = await client.selectFilePickerItem({
  application: "Example App",
  name: "Example.txt"
});
```

`name` is matched exactly against the currently observed visible picker items. It is not interpreted as a path.

Success requires a fresh postcondition with the exact item reporting `selected:true`:

```json
{
  "state": "FILE_PICKER_ITEM_SELECTED",
  "item": {
    "name": "Example.txt",
    "kind": "file",
    "selected": true,
    "enabled": true
  },
  "changed": true,
  "idempotent": false,
  "verified": true
}
```

An already-selected item succeeds idempotently without another native mutation.

## `filePicker.openDirectory`

```js
const result = await client.openFilePickerDirectory({
  application: "Example App",
  name: "FolderA"
});
```

The target must be a currently visible item already observed as `kind:"directory"`. Physical action discovery on the reference `NSOpenPanel` showed that the row itself does not expose a navigation action. Instead, the row contains an `AXTextField` whose native value is the exact visible directory name. That element explicitly advertises `AXConfirm` with the native action description `confirm`.

The macOS backend therefore rebinds the exact visible directory row, requires exactly one descendant `AXTextField` whose native value equals the requested name and whose advertised action names include `AXConfirm`, and invokes `AXConfirm` only on that element. It does not use `AXOpen`: on the reference surface that action is described as `Open Finder item` and a previous physical attempt did not provide picker navigation semantics.

Success is not delivery: a fresh picker observation must report a changed visible location while the picker remains open.

```json
{
  "state": "FILE_PICKER_DIRECTORY_OPENED",
  "directory": {"name": "FolderA", "kind": "directory"},
  "previousLocation": "Documents",
  "observedLocation": "FolderA",
  "changed": true,
  "idempotent": false,
  "verified": true
}
```

## Phase 9B3B contract decisions

- both operations require one already-open supported picker;
- item identity is an exact currently visible semantic `name`, never an arbitrary path;
- duplicate visible names fail as ambiguous;
- disabled items fail before mutation;
- selection uses native Accessibility pick/selection semantics and requires an observed selected-state postcondition;
- directory opening rejects non-directory items before mutation;
- directory opening requires exactly one descendant native text field whose value equals the requested directory name and which explicitly advertises `AXConfirm`;
- `AXConfirm` is invoked only on that exact discovered semantic target;
- `AXOpen` is not used for picker navigation on the reference backend because its observed native description is `Open Finder item`;
- missing or ambiguous confirm targets fail explicitly rather than falling back to input synthesis;
- directory opening requires an independently observed location change;
- if navigation dismisses the picker instead of changing location, the operation fails;
- neither operation accepts/cancels the picker or mutates the filesystem;
- no keyboard, clipboard, mouse coordinates, synthetic double click or filesystem enumeration are fallback mechanisms;
- all AX identifiers and native element handles remain backend-private.

Phase 9B3B validation state: `IMPLEMENTED`; deterministic Cocoa/AppKit physical checkpoint pending.

## macOS reference backend

Physical discovery with a real `NSOpenPanel` on macOS 26.5.2 showed that the accessible picker surface is visible in the Provider application's AX tree. The backend therefore resolves the registered Provider to one running process and performs fresh native Accessibility observation/rebinding for every operation.

The AppKit reference surface is recognized through backend-private native structure including an `AXSheet`, native list view and current-location control. Global focused-application information may be unavailable while the picker remains fully observable, so focus is diagnostic evidence only and is not a targeting prerequisite.

Historical Phase 9B3B physical evidence is preserved:

- `cc-phase9b3b-file-picker-navigation-selection-s01`: selection passed, but directory navigation attempted `AXConfirm` on row/list/sheet and returned `kAXErrorActionUnsupported` (`-25206`);
- `cc-phase9b3b-file-picker-navigation-selection-s02`: selection again passed; support-driven subtree scanning found `AXOpen` on a descendant, but invoking that action returned `kAXErrorAttributeUnsupported` (`-25205`);
- `cc-phase9b3b-directory-actions-discovery-s01`: read-only discovery proved that the exact `FolderA` `AXTextField` advertises `AXConfirm` (`confirm`), `AXOpen` (`Open Finder item`) and `AXShowMenu`, while the row/list/sheet do not expose a picker-navigation action.

Discovery evidence:

```text
session: cc-phase9b3a-file-picker-discovery-s02
evidence commit: 326f3283da91ee4c32a7d67bd8bb6e55b414d9ce
result: 22 PASS / 0 FAIL / 0 BLOCKED

session: cc-phase9b3b-directory-actions-discovery-s01
evidence commit: cedecaecd29846c7dacef4b24e5fe1d226b4ef5b
validated discovery product: 6533489586ce51f03296a4191dc0806a88f4c66b
result: 25 PASS / 0 FAIL / 0 BLOCKED
```

Observation evidence:

```text
session: cc-phase9b3a-file-picker-observation-s01
evidence commit: 63a2b850a2c1dcf8509a27e7f8292a1f09f811ba
validated product: c26552046ae0cc18b76ab33d6a24af98b0e68cde
result: 23 PASS / 0 FAIL / 0 BLOCKED
```

Phase 9B3C will add explicit accept/cancel semantics only after Phase 9B3B is physically validated.
