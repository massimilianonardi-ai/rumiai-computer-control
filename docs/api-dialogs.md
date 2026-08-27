# Dialog observation and semantic action API

Phase 9B1 provides read-only observation of native application-owned dialogs and sheets. Phase 9B2 adds native default/cancel semantic actions without label-based targeting.

## `dialog.list`

```js
client.listDialogs({application:"Example App"})
```

The application must resolve through an existing registered application Provider and must already be running. `dialog.list` does not launch or activate it.

The result is canonical and platform-neutral:

```json
{
  "state": "OBSERVED",
  "application": {
    "name": "Example App",
    "providerId": "example-app",
    "available": true,
    "running": true,
    "active": true,
    "bundle": "example.app"
  },
  "dialogs": [
    {
      "kind": "sheet",
      "title": null,
      "texts": ["Example alert", "Example message"],
      "modal": true,
      "buttons": [
        {"label": "Continue", "enabled": true},
        {"label": "Cancel", "enabled": true}
      ]
    }
  ]
}
```

Fields unavailable from the native accessibility surface remain `null`; Computer Control does not infer them from labels or layout. The macOS AppKit validation fixture specifically demonstrated that `AXModal` may be unavailable for an `NSAlert` sheet, in which case the canonical result correctly preserves `modal:null`.

Phase 9B1 validation state: `PHYSICALLY_VALIDATED` on the deterministic Cocoa/AppKit `NSAlert` sheet fixture.

Authoritative evidence:

```text
session: cc-phase9b1-dialog-observation-s02
evidence commit: 33a5af37e98e93e7321050f23002072ecad2290d
validated product: 2e7aaa24572fe5d55262d8cdce7f8fbc06cfaa58
result: 20 PASS / 0 FAIL / 0 BLOCKED
```

## `dialog.invokeDefault`

```js
client.invokeDialogDefault({application:"Example App", timeoutMs:3000})
```

## `dialog.invokeCancel`

```js
client.invokeDialogCancel({application:"Example App", timeoutMs:3000})
```

Phase 9B2 resolves the requested semantic button exclusively through the native Accessibility `AXDefaultButton` or `AXCancelButton` relationship of the single currently observed native dialog/sheet. The public request contains no button label, coordinate or native handle.

Preconditions:

- the application must already be running;
- exactly one Provider process must be observed;
- exactly one native dialog/sheet must be observed at action time;
- the requested native semantic relationship must be exposed;
- the resolved native button must not be disabled.

Success is not action delivery alone. After `AXPress`, Computer Control re-observes the native dialog surface until the dialog disappears. If the application exits, another dialog remains, or the postcondition cannot be established before timeout, the operation fails rather than reporting success.

A successful result has state `DIALOG_ACTION_COMPLETED`, action `default` or `cancel`, `verified:true`, and verification method `native-dialog-absent-after-semantic-action`.

Phase 9B2 validation state: `PHYSICALLY_VALIDATED` on the deterministic Cocoa/AppKit `NSAlert` sheet fixture.

Authoritative evidence:

```text
session: cc-phase9b2-dialog-semantic-actions-s01
evidence commit: 05ddc49834da2a5c6734ecd9904e3bb7051bbc37
validated product: 86421b35f6413c990cebcb76f4357412266d06f7
result: 21 PASS / 0 FAIL / 0 BLOCKED
```

The physical checkpoint proves both native default and cancel actions, a no-dialog fail-closed path, and independent dialog-absence postconditions after action delivery.

## Safety boundary

- `dialog.list` remains read-only;
- semantic action targeting never searches button labels;
- `dialog.invokeDefault` means the native platform-defined default button; it does not assert that the consequence is non-destructive;
- destructive/security-sensitive authorization remains a higher-layer policy decision and is not inferred from labels;
- `dialog.invokeCancel` means the native platform-defined cancel button;
- no arbitrary button ref, coordinate, PID or AX object crosses the public boundary;
- no implicit application launch or activation occurs;
- browser HTML/ARIA dialogs remain outside this native surface.

File-picker behavior is deferred to Phase 9B3.

## macOS reference backend

The macOS backend re-resolves the registered Provider to its single running process. Observation uses fresh Accessibility traversal. Semantic actions use native `AXDefaultButton` / `AXCancelButton` relationships and `AXPress`, followed by an independent dialog-absence postcondition.
