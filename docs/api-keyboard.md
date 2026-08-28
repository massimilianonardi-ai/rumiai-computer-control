# Keyboard fallback API

Phase 10E defines a deliberately narrow raw keyboard fallback only after physical Quartz-to-AppKit delivery discovery and public runtime/SDK validation.

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
Shift down -> settle -> key down -> settle -> key up -> settle -> Shift up
```

The short internal settling intervals are part of the current validated macOS implementation. Historical public session `cc-phase10e-keyboard-public-s01` demonstrated that posting the four shifted events back-to-back could return `KEY_POSTED` while the separate AppKit oracle failed to observe the shifted combination. The forward-only timing fix was then validated by s02.

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

Phase 10E public API state: `PHYSICALLY_VALIDATED` on the current macOS reference surface.

Authoritative public checkpoint:

```text
session: cc-phase10e-keyboard-public-s02
evidence: c5db7fffdccdbcca35e9918c3e547641f98f4059
validated product: e2eb419c352f5996ce45ad6c13b37d7ea52c8c21
test source: cfc8460f31772f5e6f6a10505fbc71fc9f6d8887
poc SHA tested: 852d6a69b9701af8c368e66dad411fb163f0d1f7
result: PASS
```

The public s02 checkpoint exercised the real runtime and SDK against a separate test-owned AppKit `NSTextView` oracle. Plain `a`, Enter and Shift+A all preserved the public `KEY_POSTED` delivery-only boundary while the independent oracle observed exact key lifecycles and the expected fixture consequences. Shift+A additionally observed one Shift-on and one Shift-off transition, with no emergency modifier release. The previous frontmost application was restored, no user content was touched, and numeric keycodes/user text were not persisted in evidence markers.

Historical public s01 evidence `707a97154f652e8e21f2e54f87c61144f996c80a` remains preserved with overall `FAIL` and documents the modifier-timing defect that s02 corrected forward-only.

See `docs/evidence/phase10e-keyboard-delivery-discovery-physical.md` and `docs/evidence/phase10e-keyboard-public-physical.md`.
