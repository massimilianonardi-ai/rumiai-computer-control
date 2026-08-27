# Phase 9C2 + 9C3 system chrome topology discovery

## Authoritative checkpoint

```text
session: cc-phase9c23-system-chrome-discovery-s01
evidence commit: f68f5bc4bc3e2fec2aa1219b402b7016107a6e6f
product expected/observed: 979ecb74dd486da832a96f02486dec7e71b42236
test source: 35ba8c86cbfa3c23ef513410e658e000af8b1a2e
poc SHA tested: 037d6b40d5eb342607e686637931d458be0d20b9
result: 32 PASS / 0 FAIL / 0 BLOCKED
reference host: macOS 26.5.2 build 25F84, arm64
```

This checkpoint is discovery evidence only. It does not promote a public Dock or menu-extras capability to `PHYSICALLY_VALIDATED` and it does not validate any mutation.

## Discovery boundary

The discovery was deliberately combined because both Phase 9C2 and Phase 9C3 are read-only observations of OS-owned system chrome. The probe:

- resolves the macOS Dock process through bundle identity `com.apple.dock`;
- resolves the observed menu-extra owners through `com.apple.systemuiserver` and `com.apple.controlcenter`;
- reads Accessibility topology, attributes and advertised action names;
- reads `kAXExtrasMenuBarAttribute` where present;
- performs no Accessibility action and no Accessibility attribute mutation;
- performs no coordinate, mouse, keyboard, clipboard, AppleScript or filesystem mutation;
- defines no public API and exposes no durable native identifier.

Public APIs and any later mutations remain separate per surface because ownership and semantic postconditions differ.

## Phase 9C2 — Dock facts observed

On the reference host the Dock resolved to exactly one running `com.apple.dock` process. Its Accessibility topology exposed:

```text
AXApplication
  -> AXList
     -> AXDockItem ...
```

The physical checkpoint observed 45 `AXDockItem` nodes and these native subroles:

```text
AXApplicationDockItem
AXFolderDockItem
AXSeparatorDockItem
AXTrashDockItem
```

Application Dock items advertised `AXPress`, commonly `AXShowExpose`, and `AXShowMenu`. Observable semantic state included visible title plus, where available, running state and status label. Folder and Trash items were distinguishable by native subrole. Separator items had no semantic title.

These facts support a read-only semantic Dock observation surface. Native subroles, action names, AX objects, PIDs, coordinates and URLs remain backend-private implementation evidence rather than public identity.

## Phase 9C3 — menu extras / status items facts observed

Both observed owner processes were running and exposed an Accessibility extras menu bar:

```text
SystemUIServer  -> AXExtrasMenuBar -> AXMenuBar
ControlCenter   -> AXExtrasMenuBar -> AXMenuBar
```

The extras menu bars contained `AXMenuBarItem` nodes with subrole `AXMenuExtra`.

Observed examples included Siri, battery, clock, sound, Wi-Fi and Control Center. Depending on the item, Accessibility exposed visible description/title, value and enabled state. The discovery also observed disabled menu-extra nodes without useful visible semantic text; these must not be assigned guessed identities.

Several native items exposed internal identifiers such as `com.apple.menuextra.*`. Those identifiers are useful backend discovery evidence but are explicitly not promoted into the public Computer Control contract.

The observed items advertised actions including `AXPress` and, for several Control Center entries, `AXCancel`. Advertisement of those actions does not establish semantic success for an invocation and therefore does not validate a mutation API.

## Consequences

The discovery supports the next implementation split:

1. Phase 9C2A — read-only Dock observation;
2. Phase 9C3A — read-only menu-extras observation;
3. Dock/menu-extra mutations, if any, remain separate and require independently observable semantic postconditions;
4. generic action delivery must not be reported as semantic success;
5. low-level delivery without a general postcondition belongs in the explicit fallback layer rather than weakening validated semantic capabilities.
