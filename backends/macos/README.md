# macOS backend

Target implementation: Swift, AXUIElement first.

The first promotion candidate is the already physically validated behavior from
`rumiai-computer-use-PoCs`. Promotion is incremental: one validated boundary at
a time, preserving its evidence and adding a conformance test here.

Do not copy v70 window minimization as validated product behavior while its
current boundary test still reports `required full observed descriptor: FAIL`.

## Transition backend

`embedded-backend.js` exposes the promoted v82 implementation owned by this
repository. Its source, Provider Registry, plugins, and Swift helpers live under
`embedded/`; it has no runtime source dependency on the laboratory repository.

`agent-ctrl` remains an installed backend executable and is intentionally not
tracked. A future Swift-first backend can replace the embedded implementation
behind the same canonical contract.
