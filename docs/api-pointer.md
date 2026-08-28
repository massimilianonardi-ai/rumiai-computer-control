# Pointer fallback API

Phase 10B introduces explicit low-level pointer fallback operations after physical Quartz-to-AppKit delivery discovery.

A semantic Computer Control operation remains preferred whenever one exists. Coordinate input is a fallback mechanism, not a substitute for semantic targeting.

## Coordinate model

Both operations currently support only:

```text
display = "primary"
```

`x` and `y` are finite non-negative coordinates local to the current primary display, with origin at the display's top-left. They use the same logical coordinate units as the current primary display `bounds` exposed by `display.list`.

The backend validates the coordinate against the primary display that exists at execution time. Coordinates outside that display fail explicitly. Native display identifiers and global desktop arrangement identifiers remain private.

This initial physical scope is the reference Mac's current primary-display topology. Multi-display coordinate conformance remains future work.

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

The helper first positions the pointer and independently verifies that coordinate. It then posts the native button down/up pair. It verifies that the pointer did not move away during the sequence.

Quartz event posting itself has no application-level acknowledgement. Therefore the public runtime reports `buttonDelivery:"POSTED"`, not `verified:true`, and explicitly returns `semanticConsequenceVerified:false`.

The physical discovery proved that the same native event path delivered one left down/up and one right down/up to a test-owned AppKit fixture on the reference Mac. That evidence establishes backend viability; it does not make an arbitrary future application's semantic reaction observable.

## Safety and lifecycle boundary

Phase 10B does not expose separate public `pointer.down` or `pointer.up` calls. A held mouse button across independent RPC calls would create fragile cross-call state and unsafe cleanup semantics.

Drag is handled separately in Phase 10C so one compound operation can own down/move/up sequencing and release cleanup.

The API does not automatically activate an application, resolve a UI element, infer a visual target, or verify an application's reaction. Computer Use must choose coordinates only when a higher-level semantic Computer Control operation cannot satisfy the task.

## Permissions

The macOS path requires Accessibility permission for synthetic input. Missing permission returns a blocked operation; the pointer API does not silently work around TCC with AppleScript or another automation layer.

## Validation state

Phase 10B public API state: `IMPLEMENTED`.

The native delivery prerequisite was physically established by:

```text
session: cc-phase10b-pointer-delivery-discovery-s02
evidence: 4c973a4400660417cfb39fb8297cd363e8c13c63
observed product: 085f0015291419b945540b59a1d56855507f6098
test source: 48f750f7bb22718f713d47c149311178169110ac
poc SHA tested: 45fefdd37f6d0449595ac1e289d09eb3b256f042
result: PASS
```

That discovery does not by itself validate the new public RPC/SDK contract. A dedicated physical runtime/SDK checkpoint is required before `pointer.move` or `pointer.click` can be promoted to `PHYSICALLY_VALIDATED`.

See `docs/evidence/phase10b-pointer-delivery-discovery-physical.md`.
