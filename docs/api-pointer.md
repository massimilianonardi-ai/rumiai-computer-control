# Pointer fallback API

Phase 10B introduces explicit low-level pointer fallback operations after physical Quartz-to-AppKit delivery discovery and public runtime/SDK validation.

A semantic Computer Control operation remains preferred whenever one exists. Coordinate input is a fallback mechanism, not a substitute for semantic targeting.

## Coordinate model

Both operations currently support only:

```text
display = "primary"
```

`x` and `y` are finite non-negative coordinates local to the current primary display, with origin at the display's top-left. They use the same logical coordinate units as the current primary display `bounds` exposed by `display.list`.

The backend validates the coordinate against the primary display that exists at execution time. Coordinates outside that display fail explicitly. Native display identifiers and global desktop arrangement identifiers remain private.

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

Supported buttons are initially `left` and `right` only.

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

The authoritative public physical checkpoint independently observed one left down/up and one right down/up in a test-owned AppKit fixture after the public SDK calls. That validates the low-level delivery path on the reference surface without making an arbitrary future application's semantic reaction observable.

## Safety and lifecycle boundary

Phase 10B does not expose separate public `pointer.down` or `pointer.up` calls. A held mouse button across independent RPC calls would create fragile cross-call state and unsafe cleanup semantics.

Drag is handled separately in Phase 10C so one compound operation can own down/move/up sequencing and release cleanup.

The API does not automatically activate an application, resolve a UI element, infer a visual target, or verify an application's reaction. Computer Use must choose coordinates only when a higher-level semantic Computer Control operation cannot satisfy the task.

## Permissions

The macOS path requires Accessibility permission for synthetic input. Missing permission returns a blocked operation; the pointer API does not silently work around TCC with AppleScript or another automation layer.

## Validation state

Phase 10B public API state: `PHYSICALLY_VALIDATED` on the current macOS reference surface.

Authoritative public checkpoint:

```text
session: cc-phase10b-pointer-public-s03
evidence: a7b878ff25e56ee7c16705dfdec1468f6a47b0a1
validated product: 3f68502848f127d73f72cac023deed511f3ce75d
test source: a3cd3f6b143d4c2e74d1d831218778ea19a3e48b
poc SHA tested: 1271dd80d331d97005e8e99c00b98af116f66225
result: 43 PASS / 0 FAIL / 0 BLOCKED
```

The same checkpoint independently observed exact left and right AppKit button delivery, restored the original pointer position, clicked no user content and persisted no fixture coordinates or native display identifiers.

Prerequisite delivery discovery:

```text
session: cc-phase10b-pointer-delivery-discovery-s02
evidence: 4c973a4400660417cfb39fb8297cd363e8c13c63
result: 42 PASS / 0 FAIL / 0 BLOCKED
```

See `docs/evidence/phase10b-pointer-public-physical.md` and `docs/evidence/phase10b-pointer-delivery-discovery-physical.md`.
