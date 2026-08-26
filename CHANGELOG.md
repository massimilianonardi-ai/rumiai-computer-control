# Changelog

## 0.9.0 — Unreleased

- Add the normalized native-control role, value, state, range and action vocabulary.
- Add `ui.describe` across the JSON-RPC runtime, macOS backend, TypeScript SDK and RumiAI adapter.
- Add role-gated `ui.invoke` for native primary actions with explicit delivery evidence.
- Add idempotent `ui.toggle` for checkbox/switch controls with explicit requested state and checked-state postcondition.
- Add idempotent `ui.select` for radio/tab/option/list-item/row controls with selected-state postcondition.
- Re-observe stateful targets after actions and fail closed on stale or ambiguous descriptor rebinding.
- Mark newly implemented stateful capabilities as `IMPLEMENTED` until external physical validation promotes them.
- Observe cached Accessibility role, name, value, base state and bounds without inferring unavailable fields.
- Fail closed when an element reference is malformed or stale, a role is unsupported, or a control is disabled.

## 0.8.0 — 2026-08-25

- Provide the standalone Computer Control contract, local runtime and TypeScript SDK.
- Provide the macOS Accessibility backend and native helper sources.
- Provide application, observation, interaction, clipboard, synchronization and window operations.
- Provide the synchronous RumiAI adapter over the socket runtime.
- Require explicit project-local portable installation paths.
