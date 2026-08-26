# Stateful native-control APIs — development contract 0.9.0

Status: **IMPLEMENTED, awaiting external boundary and physical validation**.

This document supplements `docs/api.md` while the 0.9.0 slice is under validation. It does not promote either capability to `PHYSICALLY_VALIDATED`.

## `ui.toggle`

```js
client.toggle({application, target, value:true, settle:true})
```

Supported canonical roles: `checkbox`, `switch`.

The requested boolean is explicit. The backend re-observes role, visibility, enabled state, `checked` and `mixed`. If the requested state is already observed, the operation succeeds idempotently without delivering another action. Mixed/indeterminate is never coerced to false. Otherwise the native accessibility action is delivered and the target is re-observed. Success requires `checked === value`.

Fail-closed conditions include unsupported role, disabled/non-visible control, unobservable state, stale or ambiguous rebinding, action failure and unverified postcondition.

## `ui.select`

```js
client.select({application, target, settle:true})
```

Supported canonical roles: `radio-button`, `tab`, `option`, `list-item`, `row`.

Already-selected controls succeed idempotently. Otherwise the native action is delivered and success requires a fresh observation with `selected === true`. The operation does not encode deselection semantics.

## Ephemeral-handle rule

Post-action verification does not assume that an `@eN` remains durable. The backend first attempts same-handle re-observation and, when necessary and possible, performs deterministic descriptor rebinding by normalized role and accessible name against a fresh snapshot. Zero matches fail stale; multiple matches fail ambiguous.

## Validation state

`runtime.info` reports both capabilities as `IMPLEMENTED`. A later validation session in `rumiai-computer-use-PoCs` is responsible for promoting their state after real macOS evidence.
