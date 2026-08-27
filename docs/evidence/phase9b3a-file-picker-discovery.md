# Phase 9B3A file-picker topology discovery evidence

Discovery was intentionally performed before freezing a public file-picker contract.

Authoritative physical session:

```text
session: cc-phase9b3a-file-picker-discovery-s02
evidence commit: 326f3283da91ee4c32a7d67bd8bb6e55b414d9ce
product observed: 5a7f6a00888838d042ce127f405fc050c07e4872
test source: 0856eb78a484a495b4eaf84809cbd1e392abf337
PoC SHA tested: d91bb36207c1eaf56be3be6ccdb849b85ffb394d
result: 22 PASS / 0 FAIL / 0 BLOCKED
```

Reference environment:

```text
macOS 26.5.2 build 25F84
Apple Silicon arm64
Swift 6.3.3
agent-ctrl 0.1.4
```

Observed topology from a real AppKit `NSOpenPanel` presented as a sheet:

- the Provider fixture process was `RumiAI Native File Picker Discovery Fixture` with bundle `ai.rumiai.computer-control.file-picker-discovery-fixture`;
- the complete accessible picker surface was visible under that same Provider process on the reference environment;
- global `kAXFocusedApplication` was unavailable during the session and therefore is not a valid identity prerequisite;
- the picker root was an `AXSheet` with backend-private identifier `open-panel`;
- the visible item collection was an `AXOutline` with backend-private identifier `ListView`;
- visible rows exposed names through native text fields and row selection through `AXSelected`;
- the directory row exposed an `AXDisclosureTriangle`, providing native evidence distinguishable from ordinary file rows on this reference surface;
- the visible current location was exposed by a native pop-up control with backend-private identifier `where popup` and value `PickerRoot`;
- native accept and cancel controls were present with backend-private identifiers `OKButton` and `CancelButton`;
- deterministic visible entries `Alpha.txt`, `Beta.txt` and `FolderA` were all observed through Accessibility.

The historical discovery session `cc-phase9b3a-file-picker-discovery-s01` remains preserved as FAIL. It already found the same picker surface, but incorrectly treated global focused-application PID as mandatory. `s02` corrected only that discovery-harness assumption; it did not change Computer Control.

Design consequence: macOS file-picker targeting for the current reference surface can remain Provider-scoped and fresh-AX based. Process separation must not be inferred from AppKit implementation details when the accessible surface is observed under the Provider process. Native identifiers remain backend-private and are never durable public identity.
