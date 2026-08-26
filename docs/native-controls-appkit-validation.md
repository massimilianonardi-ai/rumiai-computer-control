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

Accordingly:

- `ui.describe` and `ui.invoke` retain their previous native physical validation;
- Phase 3-7 capabilities return to `IMPLEMENTED` until Cocoa/AppKit evidence is
  recorded;
- future native physical fixtures must use standard AppKit controls or another
  unambiguously native Cocoa surface;
- Safari/WebKit behavior must not drive product-specific workarounds in the
  generic macOS backend.

## Native revalidation plan

Use a deterministic AppKit fixture containing standard controls such as
`NSButton` checkbox/radio, disclosure controls, `NSSlider`, `NSStepper`,
`NSComboBox`/`NSPopUpButton`, `NSTableView`, `NSOutlineView` and `NSScrollView`.

For every operation, success still requires a fresh native Accessibility
observation of the documented postcondition. Action delivery alone is not
semantic success.

Phase 6 and Phase 7 require backend review in addition to revalidation:

- `ui.children` must ultimately derive semantic parent/child relationships from
  native Accessibility structure rather than serialized snapshot indentation;
- scrolling must prefer native Accessibility semantics and distinguish scrolling
  a target container from page/application navigation;
- `ui.scrollIntoView` must use a native target-to-visible operation where the
  backend exposes one and verify the result afterwards.
