# Scrolling and visibility APIs

Status: **IMPLEMENTED, awaiting external physical validation**.

`ui.scroll({application,target,direction,amount})` currently defines `amount` as 1–10 semantic pages and supports vertical `up`/`down`. macOS focuses the semantic target, delivers PageUp/PageDown, then requires a fresh non-compact Accessibility snapshot to differ. Delivery without observable state change is `SCROLL_UNVERIFIED`.

`ui.scrollIntoView({application,target})` is idempotent when `visible === true`. Otherwise it uses Accessibility focus and accepts success only after a fresh description observes `visible === true`; stale refs may be rebound only by an unambiguous role+name lookup.

Wheel/gesture delivery is deliberately not treated as semantic success in this phase.
