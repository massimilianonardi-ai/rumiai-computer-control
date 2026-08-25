# macOS backend

Target implementation: Swift, AXUIElement first.

The first promotion candidate is the already physically validated behavior from
`rumiai-computer-use-PoCs`. Promotion is incremental: one validated boundary at
a time, preserving its evidence and adding a conformance test here.

Do not copy v70 window minimization as validated product behavior while its
current boundary test still reports `required full observed descriptor: FAIL`.

## Transition backend

`legacy-validated-backend.js` promotes v46 strict setText behavior through the
new runtime boundary without copying the whole PoC monolith. It is temporary and
explicitly reports itself as `macos-agent-ctrl-v46-transition`.

This keeps the product contract stable while the AX implementation and its
minimum dependencies are extracted into the future Swift backend.
