# Scrolling and visibility APIs

Status: **IMPLEMENTED, awaiting native AppKit physical validation**.

## `ui.scroll`

```js
client.scroll({application,target,direction,amount})
```

`direction` is `up` or `down`; `amount` is 1–10 backend-normalized semantic scroll units. On macOS one unit currently maps to 240 logical scroll points.

The macOS backend resolves the fresh AX target, requires it to be inside a native `scroll-area`, and delivers a target-aware wheel scroll through `agent-ctrl scroll ... --ref`. It then captures a fresh JSON AX tree and requires an observable change in that scroll-area subtree. Wheel delivery by itself is never semantic success.

## `ui.scrollIntoView`

The backend first checks target geometry against the nearest native `scroll-area`. If already intersecting the viewport, the operation is idempotent. Otherwise it calls `agent-ctrl scroll-into-view`, whose macOS AX surface uses `AXScrollToVisible`, then captures a fresh AX tree and proves that the target bounds intersect the scroll-area bounds.

The generic Accessibility `visible` flag is deliberately not used as the postcondition because it does not necessarily mean geometrically inside a scroll viewport.
