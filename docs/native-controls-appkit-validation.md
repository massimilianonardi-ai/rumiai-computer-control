# Native controls validation scope on macOS

## Scope

The macOS native-controls milestone targets controls implemented by Cocoa/AppKit
and exposed through the macOS Accessibility (AX) API.

Browser document controls are intentionally outside this milestone. HTML/ARIA
controls exposed by Safari/WebKit through AX may be useful later when designing
a browser-specific surface, but they are not accepted as physical validation of
Cocoa/AppKit control behavior.

## Correction recorded 2026-08-26

Physical micro-PoCs for `ui.toggle`, `ui.select`, `ui.expand`, `ui.collapse`,
`ui.setValue`, `ui.increment`, `ui.decrement`, `ui.children`, `ui.scroll` and
`ui.scrollIntoView` were initially exercised using HTML controls hosted by
Safari. That fixture was outside the intended native-controls scope.

The evidence remains useful as WebKit-to-AX interoperability evidence and must
not be deleted or rewritten. It does not promote a capability to
`PHYSICALLY_VALIDATED` for the native AppKit milestone.

Accordingly, the affected Phase 3-7 capabilities were temporarily returned to
`IMPLEMENTED` while the native revalidation was prepared. `ui.describe` and
`ui.invoke` retained their earlier native physical validation.

## Native revalidation requirements

The replacement physical fixture uses standard Cocoa/AppKit controls and native
macOS Accessibility observations. Safari/WebKit behavior must not drive
product-specific workarounds in the generic macOS backend.

For every operation, success requires a fresh native Accessibility observation
of the documented postcondition. Action delivery alone is not semantic success.

Phase 6 and Phase 7 additionally require native structure and scrolling
semantics rather than reconstruction from browser-oriented behavior:

- `ui.children` derives semantic relationships from the native Accessibility
  tree rather than serialized snapshot indentation;
- scrolling distinguishes target-container scrolling from page/application
  navigation;
- `ui.scrollIntoView` attempts a native target-to-visible operation and verifies
  the resulting geometry, with bounded fallback only when needed.

## Native revalidation completed 2026-08-26

The replacement Cocoa/AppKit physical validation completed successfully against
product commit:

```text
ea4a7f0bc190aa8d836ec2f123e0c1d0e470c4e1
```

Authoritative evidence is stored in:

```text
massimilianonardi-ai/rumiai-computer-use-PoCs
commit 2334690a069d65ebd5546508f447c39f10d3cd8f
tests/products/computer-control/results/2026-08-26-native-appkit-physical-PASS.md
```

The physical fixture covered native AppKit checkbox/radio, slider/stepper,
outline/disclosure hierarchy and scroll-container behavior. The validated
operations are:

- `ui.toggle`;
- `ui.select`;
- `ui.expand`;
- `ui.collapse`;
- `ui.setValue` on the native numeric reference controls;
- `ui.increment`;
- `ui.decrement`;
- `ui.children`;
- `ui.scroll`;
- `ui.scrollIntoView`.

These capabilities may therefore report `PHYSICALLY_VALIDATED` for the macOS
AppKit reference surface. This state does not imply that every canonical role or
structured value variant has already received physical conformance coverage.
Remaining role/value coverage is tracked in `docs/native-controls-roadmap.md`.

Earlier Safari/WebKit PASS and FAIL records remain immutable historical evidence
and are not reclassified as native AppKit validation.
