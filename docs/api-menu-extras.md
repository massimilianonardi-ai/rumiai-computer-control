# Menu Extras API

Phase 9C3 covers OS-owned menu extras / status items. Phase 9C3A is read-only semantic observation only; invocation remains a separate problem because native action delivery does not establish a universal semantic postcondition.

## Phase 9C3A — observation

Public SDK:

```js
client.observeMenuExtras()
```

RPC:

```text
menuExtras.observe
```

Parameters:

```json
{}
```

Menu extras are OS-owned system chrome, so this operation is global rather than application-scoped.

Result shape:

```json
{
  "state": "OBSERVED",
  "menuExtras": {
    "items": [
      {
        "title": "Siri",
        "description": "Siri",
        "value": null,
        "enabled": true
      },
      {
        "title": null,
        "description": "Batteria",
        "value": "84%",
        "enabled": true
      }
    ]
  },
  "observation": {
    "method": "macos-os-owned-native-AX-menu-extras-observation"
  },
  "backend": {
    "name": "macos-ax",
    "strategy": "os-owned-native-AX-menu-extras-observation"
  }
}
```

`menuExtras:null` is a valid observed state when no supported OS menu-extras surface is currently present.

### Public semantics

Each observed item preserves only semantic Accessibility state:

- `title`: visible native title when available, otherwise `null`;
- `description`: native accessible description when available, otherwise `null`;
- `value`: native textual value when available, otherwise `null`;
- `enabled`: native enabled state when available, otherwise `null`.

No synthetic name is invented. A native menu extra that exposes no title, description or value remains an anonymous semantic item, for example `{title:null, description:null, value:null, enabled:false}`.

The macOS backend currently observes supported OS-owned extras menu bars and concatenates their native child order into `items`. Array order is an observation order only. It is not a screen-position contract, does not expose process ownership, and callers must not infer geometry or a durable native identity from it.

Bundle identifiers used to resolve OS-owned surfaces, Accessibility identifiers such as `com.apple.menuextra.*`, AX roles/subroles, action names, AX objects, process IDs, URLs and coordinates remain backend-private.

Observation performs no Accessibility action, no Accessibility attribute mutation, no mouse/keyboard input, no clipboard operation and no AppleScript.

### Validation state

Phase 9C3A validation state: `IMPLEMENTED`.

The contract is derived from the authoritative combined read-only topology discovery:

```text
session: cc-phase9c23-system-chrome-discovery-s01
evidence: f68f5bc4bc3e2fec2aa1219b402b7016107a6e6f
product observed: 979ecb74dd486da832a96f02486dec7e71b42236
test source: 35ba8c86cbfa3c23ef513410e658e000af8b1a2e
poc SHA tested: 037d6b40d5eb342607e686637931d458be0d20b9
result: 32 PASS / 0 FAIL / 0 BLOCKED
```

That discovery observed Siri plus Control Center-owned Battery, Clock, Sound, Wi-Fi and Control Center entries, as well as anonymous disabled menu-extra nodes. It also observed native `AXPress` / `AXCancel` action advertisement and backend-private `com.apple.menuextra.*` identifiers. Those facts define the observation input but do **not** physically validate this new public `menuExtras.observe` implementation.

Promotion to `PHYSICALLY_VALIDATED` requires a separate end-to-end physical checkpoint through the real runtime and SDK.

## Invocation remains separate

Phase 9C3A introduces no generic menu-extra invocation API. A delivered native action may open a popover, toggle a state, reveal another UI surface or have another item-specific effect. Until a semantic operation has an independently observable postcondition, delivery must not be reported as semantic success. Low-level delivery, if retained, belongs in the explicit fallback layer rather than weakening the semantic capability model.
