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

Phase 9C2A validation state: `PHYSICALLY_VALIDATED` on the tested macOS Dock Accessibility surface.

Authoritative physical checkpoint:

```text
session: cc-phase9c2a-dock-observation-s02
evidence: 5662b659a3b80c236db323dfe09125b56b48eca6
validated product: b9d04f5213c5dcb00ca8dc0363f8248caa9a8916
test source: c928f3dacd3c3456072d21baaef2742e042e5b0d
poc SHA tested: 670cc9bd80d5d7f9fb315669a0f3e30e9f20b758
result: 33 PASS / 0 FAIL / 0 BLOCKED
reference host: macOS 26.5.2 build 25F84, arm64
```

The dedicated physical test resolved the real Dock through an independent native Accessibility oracle, observed 45 Dock items on the reference host, and verified that the public `(kind,title)` sequence matched the independently observed native topology exactly after canonicalization. It also verified repeated read-only observation and that public serialization exposed no native roles, action names, process identity, coordinates or native references.

The earlier s01 overall `FAIL` remains preserved as historical evidence. Its dedicated Dock physical test passed; the session failed because a discovery-era contract test still forbade the newly introduced `dock.observe` API. The s02 checkpoint corrected only that stale lifecycle guard while keeping the same product SHA under test.

See `docs/evidence/phase9c2a-dock-observation-physical.md` for the promotion record.

## Dock mutation remains separate

The discovery observed native actions such as `AXPress`, `AXShowMenu` and `AXShowExpose` on Dock items. Advertisement or successful delivery of one of those actions is not a universal semantic postcondition.

No generic Dock invocation API is introduced by Phase 9C2A. Any future mutation must define a narrower semantic operation with an independently observed success condition, or remain an explicit low-level fallback where delivery is represented as delivery rather than semantic success.
