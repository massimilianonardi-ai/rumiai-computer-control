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

The target must be a currently visible item already observed as `kind:"directory"`. Computer Control selects/rebinds that native row, inspects the actions actually advertised by the row and its descendants, and invokes only an advertised semantic open action. The macOS backend prefers `AXOpen` when exposed and may use `AXConfirm` only when the target explicitly advertises it. Success is not delivery: a fresh picker observation must report a changed visible location while the picker remains open.

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
- directory opening queries the target subtree's advertised Accessibility actions and uses only an advertised open semantic (`AXOpen`, or `AXConfirm` when explicitly supported);
- absence of a supported semantic open action fails explicitly rather than falling back to input synthesis;
- directory opening requires an independently observed location change;
- if navigation dismisses the picker instead of changing location, the operation fails;
- neither operation accepts/cancels the picker or mutates the filesystem;
- no keyboard, clipboard, mouse coordinates or filesystem enumeration are fallback mechanisms;
- all AX identifiers and native element handles remain backend-private.

Phase 9B3B validation state: `IMPLEMENTED`; deterministic Cocoa/AppKit physical checkpoint pending.

## macOS reference backend

Physical discovery with a real `NSOpenPanel` on macOS 26.5.2 showed that the accessible picker surface is visible in the Provider application's AX tree. The backend therefore resolves the registered Provider to one running process and performs fresh native Accessibility observation/rebinding for every operation.

The AppKit reference surface is recognized through backend-private native structure including an `AXSheet`, native list view and current-location control. Global focused-application information may be unavailable while the picker remains fully observable, so focus is diagnostic evidence only and is not a targeting prerequisite.

Historical Phase 9B3B physical evidence is preserved. Session `cc-phase9b3b-file-picker-navigation-selection-s01` proved native selection and its postcondition, but returned `kAXErrorActionUnsupported` (`-25206`) when `AXConfirm` was attempted for directory navigation. The product therefore no longer assumes `AXConfirm` support and instead selects from the actions advertised by the rebound target subtree.

Discovery evidence:

```text
session: cc-phase9b3a-file-picker-discovery-s02
evidence commit: 326f3283da91ee4c32a7d67bd8bb6e55b414d9ce
result: 22 PASS / 0 FAIL / 0 BLOCKED
```

Observation evidence:

```text
session: cc-phase9b3a-file-picker-observation-s01
evidence commit: 63a2b850a2c1dcf8509a27e7f8292a1f09f811ba
validated product: c26552046ae0cc18b76ab33d6a24af98b0e68cde
result: 23 PASS / 0 FAIL / 0 BLOCKED
```

Phase 9B3C will add explicit accept/cancel semantics only after Phase 9B3B is physically validated.
