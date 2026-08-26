# Structure and collection API

Status: **IMPLEMENTED, awaiting external physical validation**.

`ui.children({application,target,offset,limit})` returns only direct actionable descendants observed in a fresh non-compact Accessibility snapshot. Parentage is derived from the tree serialization's indentation: traversal stops at the next node at or above the target indentation, and only descendants at the minimum deeper indentation are returned as direct children.

The result is bounded and paginated (`limit` 1..200, default 50). It reports the total direct-child count and `hasMore`. If the ephemeral target is absent from the fresh snapshot the call fails closed with `CONTROL_TARGET_STALE`.

This API does not create stable identities, infer inaccessible children, or recursively return an unbounded tree.
