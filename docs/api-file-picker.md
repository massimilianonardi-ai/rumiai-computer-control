# Native file-picker API

Phase 9B3A provides read-only observation of a native file picker. Phase 9B3B adds native item selection and hierarchical directory expansion. Phase 9B3C adds explicit semantic accept/cancel actions.

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

The earlier unvalidated `filePicker.openDirectory` model was removed before promotion because physical sessions disproved its assumed location-change semantics.

Phase 9B3B validation state: `PHYSICALLY_VALIDATED` on the deterministic Cocoa/AppKit `NSOpenPanel` reference fixture.

## `filePicker.accept`

```js
const result = await client.acceptFilePicker({
  application: "Example App"
});
```

`accept` is an explicit semantic authorization by the caller to accept the current native picker state. The backend does not choose this action automatically and does not infer authorization from button labels.

The first Phase 9B3C physical checkpoint disproved the initial assumption that the `NSOpenPanel` sheet itself exposes `AXDefaultButton`. Earlier Phase 9B3A topology evidence had already shown the actual native AppKit surface: the picker contains an `AXButton` whose backend-private Accessibility identifier is `OKButton`. The corrected macOS backend therefore resolves exactly one button with identifier `OKButton`, requires role `AXButton`, enabled state, and advertised `AXPress`, then presses only that target.

The identifier is a platform-backend implementation detail. It is never accepted from callers and never appears in the public schema, SDK result, or RumiAI adapter.

Success requires the Provider application to remain running and a fresh independent picker observation to report `picker:null`.

## `filePicker.cancel`

```js
const result = await client.cancelFilePicker({
  application: "Example App"
});
```

The corrected macOS backend resolves exactly one `AXButton` with the previously observed backend-private Accessibility identifier `CancelButton`. It does not match the visible title `Cancel`. The button must be enabled and advertise `AXPress`; success still requires an independent picker-absence postcondition.

## Phase 9B3C contract decisions

- actions are explicit: `filePicker.accept` and `filePicker.cancel`;
- both require one already-open supported picker in exactly one registered Provider process;
- neither launches or activates an application implicitly;
- on the validated AppKit surface, accept maps to the exact backend-private native identifier `OKButton` and cancel maps to `CancelButton`;
- both targets must be `AXButton` elements and must be unique within the one supported picker;
- visible button labels are not used for action selection or authorization;
- the public API never accepts or exposes the native identifiers;
- disabled, unavailable, ambiguous, or non-pressable semantic buttons fail explicitly;
- only an advertised native `AXPress` is delivered;
- delivery alone is not success;
- success requires the Provider application to remain running and fresh `filePicker.observe` to report no picker;
- application exit is not silently treated as picker-action success;
- no coordinate, mouse, keyboard, clipboard, synthetic keypress, filesystem or dialog-label fallback is permitted;
- all native handles and internal identifiers remain backend-private.

Phase 9B3C validation state: `PHYSICALLY_VALIDATED` on the deterministic Cocoa/AppKit `NSOpenPanel` reference fixture.

## macOS reference backend and evidence

Physical discovery with a real `NSOpenPanel` on macOS 26.5.2 showed that the accessible picker surface is visible in the Provider application's AX tree. That topology included `ListView`, `OKButton`, `CancelButton`, the visible current-location control, and the file rows. Global focused-application information may be unavailable while the picker remains fully observable, so focus is diagnostic evidence only.

Historical Phase 9B3B evidence is preserved:

- `cc-phase9b3b-file-picker-navigation-selection-s01`: selection passed; generic `AXConfirm` navigation returned `kAXErrorActionUnsupported`;
- `cc-phase9b3b-file-picker-navigation-selection-s02`: selection passed; descendant `AXOpen` returned `kAXErrorAttributeUnsupported`;
- `cc-phase9b3b-directory-actions-discovery-s01`: showed `AXOpen` means `Open Finder item` and `AXConfirm` means `confirm` on the name field;
- `cc-phase9b3b-file-picker-navigation-selection-s03`: exact `AXConfirm` delivery succeeded but `location` did not change;
- `cc-phase9b3b-directory-disclosure-discovery-s01`: proved `AXPress` on the disclosure triangle changes `AXDisclosing:false→true` and exposes `Nested.txt` while location remains unchanged;
- `cc-phase9b3b-file-picker-selection-expansion-s01`: public API checkpoint validated selection, independent selected-state observation, disclosure expansion, independent `AXDisclosing=true`, visible nested content, picker preservation, stable location, and idempotence.

Canonical Phase 9B3B physical validation:

```text
session: cc-phase9b3b-file-picker-selection-expansion-s01
evidence commit: 36ca5eb400954457f44467d9028e6f26a21e70cd
validated product: 805ec5126f991bd6a19945bfda5d0fc2778ae221
test source: 5e9fb88809af10c07bcf9f109d8d1e51ff92994a
poc SHA tested: 8db375a5b23103f834d04721639400c6d61cbdc5
result: 26 PASS / 0 FAIL / 0 BLOCKED
```

Phase 9B3C history is preserved rather than rewritten:

```text
s01: cc-phase9b3c-file-picker-semantic-actions-s01
     evidence: 53239bbb4b1da389e65e24f7dc484bd119b1a31f
     product: 3cedb57d35663f74d0598b6c83645c973cdc6810
     result: 26 PASS / 0 FAIL / 1 BLOCKED
     finding: the NSOpenPanel did not expose AXDefaultButton on the picker sheet

s02: cc-phase9b3c-file-picker-semantic-actions-s02
     evidence: bc593924b065975dc52227ae6e4f81395c92e35b
     product: 2be349b1fdf2a6ea08ee893be423942d926a2c0b
     result: 26 PASS / 1 FAIL / 0 BLOCKED
     finding: native OKButton targeting dismissed the picker correctly, but the test's client.find completion observer was unreliable

diagnostic: cc-phase9b3c-file-picker-accept-result-diagnostic-s01
     evidence: d37b848c8abdb6d27da7c453627b2edcfbf2a518
     product: 2be349b1fdf2a6ea08ee893be423942d926a2c0b
     result: PASS
     finding: independent read-only AX observation captured exactly "Picker Result: accepted Alpha.txt"
```

Canonical Phase 9B3C physical validation:

```text
session: cc-phase9b3c-file-picker-semantic-actions-s03
evidence commit: 9a47234951d3de5dff9d4b975892a8b0b07e079d
validated product: 2be349b1fdf2a6ea08ee893be423942d926a2c0b
test source: 2f107d05bdce5650929db8ead670f12da2f59f54
poc SHA tested: 5cc8e8f97cc8fa139248ff3e6c28612df31aa8a9
result: 29 PASS / 0 FAIL / 0 BLOCKED
```

The final checkpoint independently proved both paths: accept selected `Alpha.txt`, dismissed the picker, left the Provider running, and produced AppKit `.OK` / `Picker Result: accepted Alpha.txt`; cancel dismissed the reopened picker, left the Provider running, and produced AppKit `.cancel` / `Picker Result: cancelled`.
