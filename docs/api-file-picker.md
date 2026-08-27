# Native file-picker API

Phase 9B3A provides read-only observation of a native file picker after a physical topology discovery checkpoint on macOS AppKit.

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
      {
        "name": "Example.txt",
        "kind": "file",
        "selected": false,
        "enabled": true
      },
      {
        "name": "FolderA",
        "kind": "directory",
        "selected": false,
        "enabled": true
      }
    ]
  }
}
```

## Contract decisions

- observation is Provider-scoped and read-only;
- no implicit launch or activation occurs;
- `picker:null` is the normal observed state when no picker is open;
- more than one simultaneously observed supported picker fails explicitly as ambiguous;
- `location` is the visible native location label, not a reconstructed or inferred absolute filesystem path;
- visible entries expose only semantic `name`, `kind`, `selected` and `enabled` state;
- unavailable boolean state remains `null` rather than guessed;
- no filesystem enumeration is used to supplement or replace the Accessibility observation;
- no file is opened, selected, navigated to, accepted or cancelled during observation;
- PIDs, AX objects, native identifiers, coordinates and process topology never cross the public contract;
- browser file inputs are outside this native surface.

## macOS reference backend

Physical discovery with a real `NSOpenPanel` on macOS 26.5.2 showed that the accessible picker surface is visible in the Provider application's AX tree. The backend therefore resolves the registered Provider to one running process and performs a fresh native Accessibility observation.

The current AppKit reference surface is recognized through backend-private native structure including an `AXSheet`, the native list view and current-location control. These identifiers are implementation details and are not public identity.

The physical discovery also showed that global focused-application information may be unavailable while the picker remains fully observable. Global focus is therefore diagnostic evidence only and is not a targeting prerequisite.

Phase 9B3A validation state: `PHYSICALLY_VALIDATED` on the deterministic Cocoa/AppKit `NSOpenPanel` reference fixture.

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

Phase 9B3B adds navigation and selection as separate mutating semantics. Phase 9B3C adds explicit accept/cancel semantics later.
