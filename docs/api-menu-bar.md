# Native menu bar API

Phase 9C1 is split into read-only observation (9C1A) and later semantic invocation (9C1B). This preserves the Computer Control invariant that action delivery is not semantic success.

## `menuBar.observe`

```js
const result = await client.observeMenuBar({
  application: "Example App"
});
```

The application must resolve through an existing registered application Provider and must already be running. Observation does not launch or activate the application.

Example result:

```json
{
  "state": "OBSERVED",
  "menuBar": {
    "items": [
      {
        "title": "Example",
        "enabled": true,
        "children": [
          {"title": "Action", "enabled": true, "children": []},
          {
            "title": "Nested",
            "enabled": true,
            "children": [
              {"title": "Nested Action", "enabled": true, "children": []}
            ]
          }
        ]
      }
    ]
  }
}
```

If the Provider application has no Accessibility-visible menu bar, `menuBar` is `null`.

## Phase 9C1A contract decisions

- Provider-scoped read-only observation only;
- exactly one running Provider process is required;
- no implicit launch or activation;
- the macOS backend resolves `kAXMenuBarAttribute` from the Provider application AX object and requires role `AXMenuBar` when present;
- the validated AppKit surface exposes the complete menu hierarchy while menus are closed, so observation never opens a menu;
- public nodes contain only `title`, `enabled`, and recursive `children`;
- empty-title separator rows are omitted from the semantic tree;
- enabled state comes from native `AXEnabled`; unavailable state remains `null` rather than guessed;
- native roles, identifiers, advertised action names, AX objects, PIDs, coordinates, shortcuts and localization-independent selector identifiers do not cross the public contract;
- no `AXUIElementPerformAction`, AX attribute mutation, mouse, keyboard, clipboard, AppleScript, filesystem operation or coordinate targeting is part of observation;
- repeated observation is non-invasive.

Phase 9C1A validation state: `IMPLEMENTED`; corrected deterministic Cocoa/AppKit physical checkpoint pending.

## Why invocation is separate

Discovery showed that native menu items advertise actions such as `AXPress` and `AXPick`, including while menus are closed. That is sufficient to identify a candidate mechanical primitive, but not sufficient to define semantic success.

A menu command can save a document, change a preference, open a window, quit an app, trigger system UI, or have no externally stable state change at all. Therefore a successful `AXPress` return cannot by itself satisfy the project-wide rule that delivery is not success.

Phase 9C1B remains pending until Computer Control has a general postcondition model for menu commands or a deliberately narrower semantic contract whose outcome can be independently observed.

## Physical discovery

Canonical discovery:

```text
session: cc-phase9c1-menu-bar-discovery-s02
evidence commit: fe203eceec6a3976c911786860b8803794d6880a
product: ebce7c87c264932144909a491d04c7f307b4cafe
test source: 72790fd9dbd8142ff71f34d823443dea107fd382
poc SHA tested: 3d94c6d393508cf0991d5b0c8c2b1490c748ce9d
result: 30 PASS / 0 FAIL / 0 BLOCKED
```

See `docs/evidence/phase9c1-menu-bar-discovery.md` for the observed native topology and the historical `s01` harness failure.
