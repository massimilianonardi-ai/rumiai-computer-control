# Dock API

Phase 9C2 is split between read-only semantic observation and any future mutation/invocation surface.

## Phase 9C2A — observation

Public SDK:

```js
client.observeDock()
```

RPC:

```text
dock.observe
```

Parameters:

```json
{}
```

The Dock is OS-owned system chrome, so this operation is global rather than application-scoped.

Result shape:

```json
{
  "state": "OBSERVED",
  "dock": {
    "items": [
      {
        "kind": "application",
        "title": "Finder",
        "running": true,
        "status": null
      },
      {
        "kind": "separator",
        "title": null,
        "running": null,
        "status": null
      },
      {
        "kind": "folder",
        "title": "Downloads",
        "running": null,
        "status": null
      },
      {
        "kind": "trash",
        "title": "Trash",
        "running": null,
        "status": null
      }
    ]
  },
  "observation": {
    "method": "macos-os-owned-native-AX-dock-observation"
  },
  "backend": {
    "name": "macos-ax",
    "strategy": "os-owned-native-AX-dock-observation"
  }
}
```

`dock:null` is a valid observed state when the OS Dock process is not currently present. More than one matching Dock process is an explicit ambiguity failure rather than a guessed target.

### Public semantics

Each observed item contains only semantic UI state:

- `kind`: `application`, `folder`, `trash`, `separator`, or `other`;
- `title`: visible native title when available, otherwise `null`;
- `running`: native application-running state when meaningful and exposed, otherwise `null`;
- `status`: visible native status label when exposed, otherwise `null`.

Array order is the native Accessibility child order observed for the Dock. It is not a coordinate contract and callers must not infer screen geometry from it.

Native Accessibility roles/subroles, action names, AX objects, process IDs, URLs, identifiers and coordinates remain backend-private. The macOS backend may use native subroles internally to canonicalize `kind`, but those native values do not become durable public identity.

Observation performs no Dock action, no Accessibility attribute mutation, no mouse/keyboard input, no clipboard operation and no AppleScript.

### Validation state

Phase 9C2A validation state: `IMPLEMENTED`.

The implementation is derived from the authoritative combined read-only topology discovery:

```text
session: cc-phase9c23-system-chrome-discovery-s01
evidence: f68f5bc4bc3e2fec2aa1219b402b7016107a6e6f
product observed: 979ecb74dd486da832a96f02486dec7e71b42236
test source: 35ba8c86cbfa3c23ef513410e658e000af8b1a2e
poc SHA tested: 037d6b40d5eb342607e686637931d458be0d20b9
result: 32 PASS / 0 FAIL / 0 BLOCKED
```

That discovery proves the native topology used to design this contract; it does **not** physically validate the new public `dock.observe` implementation. Promotion to `PHYSICALLY_VALIDATED` requires a separate end-to-end physical checkpoint through the real runtime and SDK.

## Dock mutation remains separate

The discovery observed native actions such as `AXPress`, `AXShowMenu` and `AXShowExpose` on Dock items. Advertisement or successful delivery of one of those actions is not a universal semantic postcondition.

No generic Dock invocation API is introduced by Phase 9C2A. Any future mutation must define a narrower semantic operation with an independently observed success condition, or remain an explicit low-level fallback where delivery is represented as delivery rather than semantic success.
