# Application lifecycle API

Phase 9A provides provider-scoped application lifecycle operations. The canonical contract controls applications known through RumiAI Providers rather than exposing a generic process manager.

## Phase 9A1 — inventory, launch and activation

### `application.list`

```js
client.listApplications({availableOnly:false})
```

Returns registered application Providers with cross-platform state only:

- `name`
- `providerId`
- `available`
- `running`
- `active`
- `bundle` when known

The list does not expose native application objects or durable process handles.

### `application.launch`

```js
client.launchApplication({application:"Example App"})
```

Semantics:

- requires a registered and available application Provider;
- launches the exact application resolved by the platform backend;
- if already running, succeeds idempotently without intentionally creating another instance;
- success requires a postcondition that the Provider application is observed running;
- launching does not imply the separate `application.activate` contract.

### `application.activate`

```js
client.activateApplication({application:"Example App"})
```

Semantics:

- requires the Provider application to be already running;
- does not launch implicitly;
- succeeds idempotently if already foreground;
- success requires a foreground postcondition matching the Provider identity.

Phase 9A1 is `PHYSICALLY_VALIDATED` on the deterministic macOS Cocoa/AppKit fixture. Evidence is recorded in `docs/evidence/phase9a1-application-lifecycle-physical.md`.

## Phase 9A2 — graceful termination

### `application.terminate`

```js
client.terminateApplication({application:"Example App"})
```

Semantics:

- addresses only a registered application Provider;
- if the application is already stopped, succeeds idempotently;
- on macOS, resolves the Provider bundle identity and sends a graceful `NSRunningApplication.terminate()` request;
- success requires an independent postcondition that the Provider application is no longer observed running;
- the action never force-terminates the process;
- Computer Control never answers save/discard/cancel or other application dialogs as part of termination;
- if an application refuses the request or remains open, the operation fails rather than claiming success.

Important failures include:

- `PROVIDER_NOT_FOUND` — the application is not a registered Provider;
- `APP_TERMINATE_IDENTITY_UNAVAILABLE` — the backend cannot establish a safe native application identity;
- `APP_INSTANCE_AMBIGUOUS` — more than one native application instance matches the resolved identity;
- `APP_TERMINATE_REJECTED` — the OS did not accept the graceful request;
- `APP_TERMINATION_NOT_COMPLETED` — the graceful request was accepted but the application remained running through the verification deadline.

`application.terminate` starts as `IMPLEMENTED` until deterministic physical validation proves graceful exit, idempotence and postcondition behavior on the reference AppKit fixture.

## Security boundary

Phase 9 affects system-wide application state, so the public surface is deliberately narrow:

- only registered application Providers are addressable;
- no arbitrary executable path, PID or shell command is accepted from the caller;
- no native process handle becomes durable public identity;
- launch uses the exact Provider-resolved application bundle;
- launch, activation and termination remain distinct actions;
- termination is graceful-only; no force-kill fallback exists;
- dialogs caused by an application are separate UI state and are never auto-confirmed by lifecycle code;
- success requires observed postconditions.
