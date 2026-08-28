# Pointer fallback API

Phase 10B, Phase 10C and Phase 10D provide explicit low-level pointer fallback operations after physical Quartz-to-AppKit delivery discovery.

A semantic Computer Control operation remains preferred whenever one exists. Coordinate input is a fallback mechanism, not a substitute for semantic targeting.

## Coordinate model

Pointer fallback operations currently support only:

```text
display = "primary"
```

Coordinates are finite non-negative values local to the current primary display, with origin at the display's top-left. They use the same logical coordinate units as the current primary display `bounds` exposed by `display.list`.

The backend validates coordinates against the primary display that exists at execution time. Coordinates outside that display fail explicitly. Native display identifiers and global desktop arrangement identifiers remain private.

This physical scope is the reference Mac's current primary-display topology. Multi-display coordinate conformance remains future work.

## `pointer.move`

SDK:

```js
client.movePointer({display:"primary", x:640, y:420})
```

RPC: `pointer.move`.

A successful result is position-verified. The macOS helper posts a native Quartz move event and then independently re-reads the current pointer location. `MOVED` is returned only when the requested position is observed. If the pointer is already there, the operation is idempotent and does not need to post another move event.

## `pointer.click`

SDK:

```js
client.clickPointer({display:"primary", x:640, y:420, button:"left"})
```

Supported buttons are `left` and `right`. RPC: `pointer.click`.

A successful result intentionally does **not** claim semantic success. The helper positions the pointer and independently verifies the requested coordinate immediately before button delivery, then posts the native button down/up pair. Quartz posting itself has no application-level acknowledgement, so the public runtime reports `buttonDelivery:"POSTED"` and `semanticConsequenceVerified:false`.

## `pointer.drag`

Phase 10C exposes drag as one atomic fallback operation rather than public held-button state.

SDK:

```js
client.dragPointer({
  display: "primary",
  source: {x: 520, y: 420},
  destination: {x: 660, y: 420},
  button: "left"
})
```

RPC: `pointer.drag`.

Only `button:"left"` is currently supported. Timing, step count and easing are backend-private implementation details. Source and destination must differ.

A successful result reports low-level delivery only:

```json
{
  "state": "DRAG_POSTED",
  "display": "primary",
  "source": {"x": 520, "y": 420},
  "destination": {"x": 660, "y": 420},
  "button": "left",
  "sourcePositionVerified": true,
  "buttonLifecycle": "POSTED",
  "dragDelivery": "POSTED",
  "releasePosted": true,
  "semanticConsequenceVerified": false,
  "verification": {
    "sourcePositionMethod": "quartz-current-pointer-location",
    "dragMethod": "quartz-event-post-only",
    "releaseMethod": "quartz-left-mouse-up-post"
  },
  "backend": {
    "name": "macos-quartz",
    "strategy": "primary-display-pointer-drag-post",
    "fallback": true
  }
}
```

Before button-down, the helper positions the pointer at `source` and independently re-observes that location. It constructs the complete normal down/drag/up lifecycle before posting button-down, then posts the sequence inside one helper invocation. The backend also requires the native source/destination values to match the canonical request.

`releasePosted:true` means the normal successful lifecycle posted its terminating left-button-up event. Any path requiring an emergency release is not success. None of these facts claims that an arbitrary application's intended drag/drop semantic consequence occurred.

The authoritative public physical checkpoint exercised the real runtime and SDK. A separate AppKit fixture independently observed one mouse-down, four mouse-dragged events and one mouse-up, and its hit-test-transparent marker reached the destination. The fixture restored the pointer, needed no emergency release, touched no user content and persisted no coordinates or native display identifiers.

Phase 10C public API state: `PHYSICALLY_VALIDATED` on the current macOS reference surface.

## `pointer.wheel`

Phase 10D exposes a narrow vertical raw-wheel fallback. It is lower-level than semantic `ui.scroll`: use `ui.scroll` whenever Computer Control has a semantic scroll target and postcondition.

SDK:

```js
client.wheelPointer({
  display: "primary",
  x: 640,
  y: 420,
  direction: "down",
  amount: 3
})
```

RPC: `pointer.wheel`.

The public vocabulary is canonical:

- `direction` is only `"up"` or `"down"`;
- `amount` is an integer from `1` through `10` line units;
- the target is one explicit primary-display-local point;
- there are no public Quartz `wheel1`/`wheel2`/`wheel3` deltas, pixel units, phase/momentum fields or gesture semantics.

The helper positions the pointer at the requested point and independently re-observes that location immediately before posting one vertical Quartz line-wheel event. Physical discovery established the backend-private reference-surface sign mapping: canonical `up` maps to positive Quartz wheel axis 1, while canonical `down` maps to negative Quartz wheel axis 1. The native sign is not exposed in the request or result.

A successful result reports posting only:

```json
{
  "state": "WHEEL_POSTED",
  "display": "primary",
  "position": {"x": 640, "y": 420},
  "direction": "down",
  "amount": 3,
  "positionVerified": true,
  "wheelDelivery": "POSTED",
  "semanticConsequenceVerified": false,
  "verification": {
    "positionMethod": "quartz-current-pointer-location",
    "wheelMethod": "quartz-event-post-only"
  },
  "backend": {
    "name": "macos-quartz",
    "strategy": "primary-display-pointer-wheel-post",
    "fallback": true
  }
}
```

`WHEEL_POSTED` does not mean an arbitrary application scrolled, scrolled in the intended semantic container, or reached a requested semantic state. A stronger consequence claim requires an independent observer.

The authoritative public physical checkpoint exercised the real runtime and SDK for both canonical directions. A separate test-owned AppKit `NSScrollView` oracle independently observed one wheel event and an `increasing-y` viewport consequence for `direction:"down"`, then after exact baseline reset observed one wheel event and a `decreasing-y` consequence for `direction:"up"`. The public result kept the native sign private, restored pointer/focus, touched no user content and persisted no fixture coordinates, offsets or native display identifiers.

Phase 10D public API state: `PHYSICALLY_VALIDATED` on the current macOS reference surface.

## Safety and lifecycle boundary

There are no public `pointer.down` or `pointer.up` calls. A held mouse button across independent RPC calls would create fragile cross-call state and unsafe cleanup semantics.

`pointer.drag` owns the complete button lifecycle in one operation. Pointer fallback APIs do not automatically activate an application, resolve a UI element, infer a visual target, or verify an application's reaction. Computer Use must choose coordinates only when a higher-level semantic Computer Control operation cannot satisfy the task.

`pointer.wheel` must not replace semantic `ui.scroll` when a semantic scroll target is available. Its coordinate point and posted wheel event are mechanics, not semantic targeting or semantic success.

## Permissions

The macOS path requires Accessibility permission for synthetic input. Missing permission returns a blocked operation; the pointer API does not silently work around TCC with AppleScript or another automation layer.

## Validation state

Phase 10B move/click: `PHYSICALLY_VALIDATED`.

Authoritative Phase 10B public checkpoint:

```text
session: cc-phase10b-pointer-public-s03
evidence: a7b878ff25e56ee7c16705dfdec1468f6a47b0a1
validated product: 3f68502848f127d73f72cac023deed511f3ce75d
test source: a3cd3f6b143d4c2e74d1d831218778ea19a3e48b
poc SHA tested: 1271dd80d331d97005e8e99c00b98af116f66225
result: 43 PASS / 0 FAIL / 0 BLOCKED
```

Phase 10C drag: `PHYSICALLY_VALIDATED`.

Authoritative Phase 10C public checkpoint:

```text
session: cc-phase10c-pointer-drag-public-s02
evidence: 1e0286c271cefddc36be7fc84008083d0658bd82
validated product: 43a26d1f369c39dbed6ca8131af8d02bd8e17b47
test source: 57f9036720f3b95af77b0803878a29bd223c63c1
poc SHA tested: 0def3a8ba72e8cceffc03ec23721e63c2504decf
result: PASS
```

Phase 10D wheel: `PHYSICALLY_VALIDATED`.

Authoritative Phase 10D public checkpoint:

```text
session: cc-phase10d-pointer-wheel-public-s01
evidence: b1ed223bb401ab79b5b7e6cc11c8512347afe0be
validated product: a3fcd4cbaa4f770e59bd974c0239b9af35701e99
test source: 7a0d62b2723bd0dca11e57a9b8aa931251a6f475
poc SHA tested: 37b03c1e7a59f712bfa674122fb636b5ca24447b
result: PASS
```

Prerequisite Phase 10D delivery discovery:

```text
session: cc-phase10d-wheel-delivery-discovery-s02
evidence: 6e63c9e1450db6b32510bb17250722bb3efc2f3b
result: PASS
```

See the Phase 10B/10C evidence files plus `docs/evidence/phase10d-wheel-delivery-discovery-physical.md` and `docs/evidence/phase10d-pointer-wheel-public-physical.md`.
