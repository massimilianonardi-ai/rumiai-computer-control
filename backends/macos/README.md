# macOS backend

Target implementation: Swift, AXUIElement first.

The first promotion candidate is the already physically validated behavior from
`rumiai-computer-use-PoCs`. Promotion is incremental: one validated boundary at
a time, preserving its evidence and adding a conformance test here.

Do not copy v70 window minimization as validated product behavior while its
current boundary test still reports `required full observed descriptor: FAIL`.
