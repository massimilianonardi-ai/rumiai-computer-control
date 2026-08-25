# Changelog

## 0.3.0 — 2026-08-25

- Separate runtime readiness from application readiness.
- Add `application.ensureReady` and `application.getForeground`.
- Add `ui.get` and `ui.getBounds`.
- Correct transport decoding for quoted AX scalar values.
- Physically validate the complete application and observation boundary.

## 0.2.0 — 2026-08-25

- Add `ui.snapshot` observation.
- Add normalized `ui.find` by semantic query or role.
- Return structured actionable nodes from snapshots.
- Physically validate `runtime.info → ui.snapshot → ui.find → ui.setText` on macOS.
- Promote the TypeScript SDK and macOS transition backend to `0.2.0`.

## 0.1.0 — 2026-08-25

- Create standalone repository architecture.
- Add local JSON-RPC runtime and TypeScript SDK.
- Add strict verified `ui.setText` transition backend boundary.
