# Native semantic structure

`ui.children` observes bounded structure from the backend's native Accessibility tree.

```js
client.children({application,target,role?,depth?,offset?,limit?})
```

The target may be an actionable `@eN` reference or a structural scope `@sN` reference. Accepting a scope reference here does **not** make structural nodes actionable; it only permits observation of their subtree.

Defaults: `depth=1`, `offset=0`, `limit=50`. `depth` is bounded to 12 and `limit` to 200. `role` filters returned nodes while traversal still follows the true native hierarchy.

On macOS the backend consumes the JSON AX tree produced by `agent-ctrl`, which is built from `AXChildren`. It does not reconstruct hierarchy from indentation in a pretty-printed snapshot. Each returned child includes its relative `depth`; pagination is applied after depth and role filtering.

References remain snapshot-scoped. If the original ref changed, a unique role+accessible-name descriptor may be rebound from the fresh tree; zero matches fail stale and multiple matches fail ambiguous.
