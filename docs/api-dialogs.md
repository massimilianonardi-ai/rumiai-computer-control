# Dialog observation API

Phase 9B1 introduces read-only observation of native application-owned dialogs and sheets.

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

Fields unavailable from the native accessibility surface remain `null`; Computer Control does not infer them from labels or layout.

## Safety boundary

Phase 9B1 is observation-only:

- no dialog button is invoked;
- no dialog or sheet is dismissed;
- no default/cancel meaning is inferred from button text;
- no destructive/non-destructive classification is inferred from labels;
- no native AX object, PID or durable native handle crosses the public boundary;
- browser HTML/ARIA dialogs remain outside this native surface.

Default/cancel semantic actions are deferred to Phase 9B2, where native Accessibility relationships can be used instead of text heuristics. File-picker behavior is deferred to Phase 9B3.

## macOS reference backend

The macOS implementation re-resolves the registered Provider to its single running process and performs a fresh Accessibility observation. It recognizes native dialog/sheet surfaces and returns visible static text, modal state and button labels/enabled state when those values are exposed by Accessibility.

Validation state: `IMPLEMENTED` until deterministic Cocoa/AppKit physical validation passes.
