# Phase 9C1A menu bar observation physical evidence

## Authoritative checkpoint

```text
session: cc-phase9c1a-menu-bar-observation-s02
evidence commit: decc4ccd989c694e624e3c3db69884b6903b0cee
validated product: d0d1d23eedb7258d1fc292e3647559cf96d726d5
test source: 2018e5ede25b44dc5f68285ce103ec5eb3355bfd
poc SHA tested: 0cb4359a18040d0d51c0ab3546375e6d7ac5cf7f
result: 31 PASS / 0 FAIL / 0 BLOCKED
reference host: macOS 26.5.2 build 25F84, arm64
```

Historical `cc-phase9c1a-menu-bar-observation-s01` remains immutable. The corrected `s02` checkpoint is authoritative for promotion.

## What was physically validated

The public `menuBar.observe` operation was exercised through the real runtime and SDK against a deterministic Cocoa/AppKit application Provider.

The physical checkpoint verified:

- the Provider application was already running and no product API launched it implicitly;
- capability metadata exposed `menuBar.observe` as the implemented Phase 9C1A surface under test;
- `menuBar.observe({application})` returned `state:"OBSERVED"` and a non-null semantic menu tree;
- the deterministic `RumiAI Actions` branch was present without opening any menu;
- `Alpha Action` was observed enabled;
- `Disabled Action` was observed disabled after the fixture disabled AppKit automatic menu enabling;
- `Nested Group -> Nested Action` was observed with the expected recursive hierarchy;
- an independent native Accessibility topology probe agreed with the public observation for the deterministic branch;
- public output omitted backend-private selector identifiers, native action names, AX roles/objects and native handles;
- repeated observation preserved the deterministic branch and did not trigger the fixture action result;
- no AX action, AX attribute mutation, coordinate input, mouse, keyboard, clipboard, AppleScript or filesystem mutation was used by the observation path.

## Promotion consequence

Phase 9C1A `menuBar.observe` is `PHYSICALLY_VALIDATED` on the deterministic macOS Cocoa/AppKit reference surface represented by this checkpoint.

The validation does not promote menu command invocation. Phase 9C1B remains separate because successful native action delivery is not, by itself, a general semantic postcondition for heterogeneous menu commands.
