# Application lifecycle API

Phase 9A introduces provider-scoped application lifecycle operations. The canonical contract intentionally controls applications known through RumiAI Providers rather than exposing a generic process manager.

## Phase 9A1

### `application.list`

SDK:

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

SDK:

```js
client.launchApplication({application:"Example App"})
```

Semantics:

- requires a registered and available application Provider;
- launches the exact application resolved by the platform Desktop Plugin;
- if already running, succeeds idempotently without launching another instance;
- success requires a postcondition that the Provider application is observed running;
- launching does not imply the separate `application.activate` contract.

### `application.activate`

SDK:

```js
client.activateApplication({application:"Example App"})
```

Semantics:

- requires the Provider application to be already running;
- does not launch implicitly;
- succeeds idempotently if already foreground;
- otherwise delegates activation to the Desktop Plugin;
- success requires a foreground postcondition matching the Provider identity.

## Security boundary

Phase 9 affects system-wide application state, so the public surface is deliberately narrow:

- only registered application Providers are addressable;
- no arbitrary executable path or command is accepted from the caller;
- no native process handle becomes durable public identity;
- launch uses the exact Provider-resolved application bundle;
- activation and launch remain distinct actions;
- success requires observed postconditions.

`application.terminate` is intentionally deferred to Phase 9A2 for a separate graceful-termination and consent review. No force-kill behavior is part of Phase 9A1.

## Validation state

Phase 9A1 starts as `IMPLEMENTED`. It may be promoted only after deterministic physical Cocoa/AppKit validation proves application inventory, launch, launch idempotence, activation, activation idempotence, foreground verification, and the no-implicit-launch rule.
