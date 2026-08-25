# macOS backend

The current implementation uses macOS Accessibility and native Swift helpers.
`backend.js` exposes the canonical backend interface; its runtime source,
Provider Registry, platform operations and helpers live under `runtime/`.

`agent-ctrl` is an installed backend executable and is intentionally not
tracked. Another native implementation can replace it behind the same canonical
contract without changing consumers.
