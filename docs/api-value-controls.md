# Value and range mutation APIs

Status: **IMPLEMENTED, awaiting external physical validation**.

`ui.setValue` supports canonical slider, spin-button, combo-box, date, time and date-time controls when a current value is observable and the backend can write the value semantically. Success requires a fresh observation equal to the requested value; equality is idempotent. Read-only controls fail closed.

`ui.increment` and `ui.decrement` initially support slider and spin-button. The current macOS strategy focuses the observed control, delivers the platform keyboard semantic step (Right/Left for slider, Up/Down for spin-button) and accepts success only when a fresh numeric observation changes in the requested direction.

The API intentionally does not fabricate `min`, `max` or `step` while those attributes are unavailable from the current cached Accessibility backend. Directional verification is used instead of claiming a specific step size.
