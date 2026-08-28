# Keyboard fallback API

Phase 10E defines a deliberately narrow raw keyboard fallback only after physical Quartz-to-AppKit delivery discovery.

A semantic Computer Control operation remains preferred whenever one exists. Structured text mutation, semantic invoke and other higher-level operations must not be replaced by raw key delivery when they can satisfy the task.

## `keyboard.press`

RPC: `keyboard.press`.

SDK:

```js
client.pressKey({key:"a", modifiers:[]})
client.pressKey({key:"a", modifiers:["shift"]})
client.pressKey({key:"enter", modifiers:[]})
```

The initial physically grounded vocabulary is closed:

- `key:"a"`, `modifiers:[]`;
- `key:"a"`, `modifiers:["shift"]`;
- `key:"enter"`, `modifiers:[]`.

No other printable key, special key, modifier or modifier combination is part of Phase 10E. Numeric virtual-key codes are backend-private.

The operation owns the entire low-level lifecycle in one call. There are no public keyboard key-down, key-up or modifier-held calls.

A successful result reports posting only:

```json
{
  "state": "KEY_POSTED",
  "key": "a",
  "modifiers": ["shift"],
  "keyLifecycle": "POSTED",
  "modifierLifecycle": "POSTED",
  "semanticConsequenceVerified": false,
  "verification": {
    "keyMethod": "quartz-keyboard-event-post-only",
    "modifierMethod": "quartz-modifier-event-post-only"
  },
  "backend": {
    "name": "macos-quartz",
    "strategy": "canonical-keyboard-press-post",
    "fallback": true
  }
}
```

For an unmodified key, `modifierLifecycle` is `"NOT_REQUIRED"` and `modifierMethod` is `"not-required"`.

`KEY_POSTED` does not mean that an arbitrary application accepted text, triggered a shortcut, submitted a form, or reached the intended semantic state. Stronger consequence claims require an independent observer.

## Safety boundary

The native helper constructs the complete normal lifecycle before posting the first event. For a shifted key the lifecycle is conceptually:

```text
Shift down -> key down -> key up -> Shift up
```

The native implementation must not expose a held modifier across RPC calls. The backend accepts success only when the helper reports a complete normal modifier lifecycle and no emergency modifier release.

## Native identity boundary

The macOS implementation uses platform-native symbolic key constants internally. Numeric virtual-key values are not public contract values and must not appear in SDK types, JSON schemas, API results or evidence logs.

## Validation state

Phase 10E delivery discovery: `PHYSICALLY_OBSERVED`.

Authoritative discovery checkpoint:

```text
session: cc-phase10e-keyboard-delivery-discovery-s01
evidence: 1aa6efa523dab83d7dd5e2b14fb1b6deb83dc324
observed product: 0f4d2c0378b12df50ed192721dded97edff9f72e
test source: fd462455a0b989b459d63d5a3d5833420a191d2f
poc SHA tested: ddd7f69cffe3b2eed67b9e3dfc2a7bd57179d589
result: PASS
```

Phase 10E public API state: `IMPLEMENTED`. A dedicated public physical checkpoint through the real runtime and SDK is required before `PHYSICALLY_VALIDATED`.

See `docs/evidence/phase10e-keyboard-delivery-discovery-physical.md`.
