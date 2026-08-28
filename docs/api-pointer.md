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

## Safety and lifecycle boundary

There are no public `pointer.down` or `pointer.up` calls. A held mouse button across independent RPC calls would create fragile cross-call state and unsafe cleanup semantics.

`pointer.drag` owns the complete button lifecycle in one operation. The pointer APIs do not automatically activate an application, resolve a UI element, infer a visual target, or verify an application's reaction. Computer Use must choose coordinates only when a higher-level semantic Computer Control operation cannot satisfy the task.

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

Prerequisite Phase 10C delivery discovery:

```text
session: cc-phase10c-drag-delivery-discovery-s01
evidence: 47ee8e31a08597cffc0c773dfaf72a093501e5c4
result: PASS
```

See `docs/evidence/phase10b-pointer-public-physical.md`, `docs/evidence/phase10b-pointer-delivery-discovery-physical.md`, `docs/evidence/phase10c-drag-delivery-discovery-physical.md` and `docs/evidence/phase10c-pointer-drag-public-physical.md`.
