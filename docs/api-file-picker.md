# Native file-picker API

Phase 9B3A provides read-only observation of a native file picker. Phase 9B3B adds native item selection and hierarchical directory expansion while keeping picker dismissal separate for Phase 9B3C.

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
- expanded outline descendants may appear as additional visible items while `location` remains unchanged;
- no filesystem enumeration is used to supplement or replace Accessibility observation;
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

Success requires a fresh postcondition with the exact item reporting `selected:true`. An already-selected item succeeds idempotently without another native mutation.

## `filePicker.expandDirectory`

```js
const result = await client.expandFilePickerDirectory({
  application: "Example App",
  name: "FolderA"
});
```

The target must be one exact currently visible item observed as `kind:"directory"`.

Physical discovery on the reference `NSOpenPanel` proved that hierarchical navigation in the native outline is represented by disclosure, not by a change of the picker current-location control. A directory row exposes an `AXDisclosureTriangle`; pressing its advertised `AXPress` action changed the row from `AXDisclosing=false` to `AXDisclosing=true`, made `Nested.txt` visible, preserved the picker, and left `location="PickerRoot"` unchanged.

The macOS backend therefore:

1. rebinds the exact visible directory row;
2. if already `AXDisclosing=true`, succeeds idempotently;
3. otherwise resolves its `AXDisclosureTriangle`;
4. requires that triangle to advertise `AXPress`;
5. invokes `AXPress`;
6. uses a separate fresh read-only helper to verify `AXDisclosing=true`.

Example result:

```json
{
  "state": "FILE_PICKER_DIRECTORY_EXPANDED",
  "directory": {"name": "FolderA", "kind": "directory"},
  "location": "PickerRoot",
  "changed": true,
  "idempotent": false,
  "verified": true
}
```

Repeated expansion of an already expanded directory succeeds with `changed:false` and `idempotent:true`.

## Phase 9B3B contract decisions

- both operations require one already-open supported picker;
- item identity is an exact currently visible semantic `name`, never an arbitrary path;
- duplicate visible names fail as ambiguous;
- disabled items fail before mutation;
- selection uses native Accessibility pick/selection semantics and requires an observed selected-state postcondition;
- directory expansion rejects non-directory items before mutation;
- expansion uses only the row's native `AXDisclosureTriangle` and advertised `AXPress`;
- expansion success requires an independent fresh `AXDisclosing=true` observation;
- the picker must remain open;
- expansion does not imply or require a current-location change;
- neither operation accepts/cancels the picker or mutates the filesystem;
- no `AXConfirm`, `AXOpen`, keyboard, clipboard, mouse coordinates, synthetic double click or filesystem enumeration are fallback mechanisms;
- all AX identifiers and native element handles remain backend-private.

The earlier unvalidated `filePicker.openDirectory` model was removed before promotion because three physical sessions disproved its assumed location-change semantics.

Phase 9B3B validation state: `PHYSICALLY_VALIDATED` on the deterministic Cocoa/AppKit `NSOpenPanel` reference fixture.

## macOS reference backend and evidence

Physical discovery with a real `NSOpenPanel` on macOS 26.5.2 showed that the accessible picker surface is visible in the Provider application's AX tree. Global focused-application information may be unavailable while the picker remains fully observable, so focus is diagnostic evidence only.

Historical Phase 9B3B evidence is preserved:

- `cc-phase9b3b-file-picker-navigation-selection-s01`: selection passed; generic `AXConfirm` navigation returned `kAXErrorActionUnsupported`;
- `cc-phase9b3b-file-picker-navigation-selection-s02`: selection passed; descendant `AXOpen` returned `kAXErrorAttributeUnsupported`;
- `cc-phase9b3b-directory-actions-discovery-s01`: showed `AXOpen` means `Open Finder item` and `AXConfirm` means `confirm` on the name field;
- `cc-phase9b3b-file-picker-navigation-selection-s03`: exact `AXConfirm` delivery succeeded but `location` did not change;
- `cc-phase9b3b-directory-disclosure-discovery-s01`: proved `AXPress` on the disclosure triangle changes `AXDisclosing:false→true` and exposes `Nested.txt` while location remains unchanged;
- `cc-phase9b3b-file-picker-selection-expansion-s01`: public API checkpoint validated selection, independent selected-state observation, disclosure expansion, independent `AXDisclosing=true`, visible nested content, picker preservation, stable location, and idempotence.

Canonical physical validation:

```text
session: cc-phase9b3b-file-picker-selection-expansion-s01
evidence commit: 36ca5eb400954457f44467d9028e6f26a21e70cd
validated product: 805ec5126f991bd6a19945bfda5d0fc2778ae221
test source: 5e9fb88809af10c07bcf9f109d8d1e51ff92994a
poc SHA tested: 8db375a5b23103f834d04721639400c6d61cbdc5
result: 26 PASS / 0 FAIL / 0 BLOCKED
```

Phase 9B3C adds explicit accept/cancel semantics after this completed Phase 9B3B checkpoint.
