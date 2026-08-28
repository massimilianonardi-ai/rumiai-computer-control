# Pointer fallback API

Phase 10B and Phase 10C provide explicit low-level pointer fallback operations after physical Quartz-to-AppKit delivery discovery.

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

RPC:

```text
pointer.move
```

A successful result is position-verified:

```json
{
  "state": "MOVED",
  "verified": true,
  "display": "primary",
  "position": {"x": 640, "y": 420},
  "changed": true,
  "idempotent": false,
  "verification": {
    "method": "quartz-current-pointer-location",
    "evidence": {"display": "primary", "x": 640, "y": 420}
  },
  "backend": {
    "name": "macos-quartz",
    "strategy": "primary-display-pointer-move",
    "fallback": true
  }
}
```

The macOS helper posts a native Quartz move event and then independently re-reads the current pointer location. `MOVED` is returned only when the requested position is observed. If the pointer is already there, the operation is idempotent and does not need to post another move event.

## `pointer.click`

SDK:

```js
client.clickPointer({display:"primary", x:640, y:420, button:"left"})
```

Supported buttons are `left` and `right`.

RPC:

```text
pointer.click
```

A successful result intentionally does **not** claim semantic success:

```json
{
  "state": "CLICK_POSTED",
  "display": "primary",
  "position": {"x": 640, "y": 420},
  "button": "left",
  "positionVerified": true,
  "buttonDelivery": "POSTED",
  "semanticConsequenceVerified": false,
  "verification": {
    "positionMethod": "quartz-current-pointer-location",
    "buttonMethod": "quartz-event-post-only"
  },
  "backend": {
    "name": "macos-quartz",
    "strategy": "primary-display-pointer-click-post",
    "fallback": true
  }
}
```

The helper first positions the pointer and independently verifies the requested coordinate immediately before button delivery. It then posts the native button down/up pair at that coordinate. Cursor motion after posting is not treated as evidence that posting failed; application-level delivery is instead established only by a separate observer when a test requires that stronger claim.

Quartz event posting itself has no application-level acknowledgement. Therefore the public runtime reports `buttonDelivery:"POSTED"`, not a generic semantic `verified:true`, and explicitly returns `semanticConsequenceVerified:false`.

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

RPC:

```text
pointer.drag
```

Only `button:"left"` is currently supported. Timing, step count and easing are backend-private implementation details.

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

Before button-down, the helper positions the pointer at `source` and independently re-observes that location. It constructs the complete down/drag/up lifecycle before posting button-down, then posts the sequence inside one helper invocation. A construction failure therefore occurs before a held-button state exists.

`releasePosted:true` means the normal successful lifecycle posted its terminating left-button-up event. It is not a claim that an arbitrary application's intended drag/drop semantic consequence occurred.

The Phase 10C delivery discovery independently observed exactly one AppKit mouse-down, four drag events, one mouse-up and a test-owned marker reaching its destination. This establishes viability of the native path but does not turn future raw coordinate drags into semantically verified operations.

Phase 10C public API state: `IMPLEMENTED`. A dedicated runtime/SDK physical checkpoint is required before promotion to `PHYSICALLY_VALIDATED`.

## Safety and lifecycle boundary

There are no public `pointer.down` or `pointer.up` calls. A held mouse button across independent RPC calls would create fragile cross-call state and unsafe cleanup semantics.

`pointer.drag` owns the complete button lifecycle in one operation. The implementation constructs all normal-path drag events before button-down and contains a defensive emergency-release path for future failure paths. Any run requiring an emergency release is not returned as success.

The pointer APIs do not automatically activate an application, resolve a UI element, infer a visual target, or verify an application's reaction. Computer Use must choose coordinates only when a higher-level semantic Computer Control operation cannot satisfy the task.

## Permissions

The macOS path requires Accessibility permission for synthetic input. Missing permission returns a blocked operation; the pointer API does not silently work around TCC with AppleScript or another automation layer.

## Validation state

Phase 10B move/click: `PHYSICALLY_VALIDATED` on the current macOS reference surface.

Authoritative Phase 10B public checkpoint:

```text
session: cc-phase10b-pointer-public-s03
evidence: a7b878ff25e56ee7c16705dfdec1468f6a47b0a1
validated product: 3f68502848f127d73f72cac023deed511f3ce75d
test source: a3cd3f6b143d4c2e74d1d831218778ea19a3e48b
poc SHA tested: 1271dd80d331d97005e8e99c00b98af116f66225
result: 43 PASS / 0 FAIL / 0 BLOCKED
```

Phase 10C drag: `IMPLEMENTED` after delivery discovery.

Authoritative Phase 10C discovery checkpoint:

```text
session: cc-phase10c-drag-delivery-discovery-s01
evidence: 47ee8e31a08597cffc0c773dfaf72a093501e5c4
observed product: 37069dcf683c168c3b9727e5b4464ff457b1222c
test source: 6c13b1e8868ec5667cc9a6e4611d4f69799dda67
poc SHA tested: a6b9c4d4afd321b99276c442a72f61a73d8baae9
result: PASS
```

See `docs/evidence/phase10b-pointer-public-physical.md`, `docs/evidence/phase10b-pointer-delivery-discovery-physical.md` and `docs/evidence/phase10c-drag-delivery-discovery-physical.md`.
