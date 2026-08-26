# Expand/collapse native-control APIs

Status: **IMPLEMENTED, awaiting external physical validation**.

`ui.expand({application,target,settle})` and `ui.collapse({application,target,settle})` operate on controls whose Accessibility state exposes an observable boolean `expanded` property. Initial canonical roles are combo box, menu, tree item, list item, row and group.

Both operations are idempotent. If the requested state is already observed, no action is delivered. Otherwise the backend performs the semantic element action and accepts success only after a fresh observation proves `expanded === requestedState`. Stale or ambiguous rebinding, unavailable state, unsupported role, disabled/hidden controls and unverifiable postconditions fail closed.

The capabilities are reported as `IMPLEMENTED`, not `PHYSICALLY_VALIDATED`, until the external macOS micro-PoC passes.
