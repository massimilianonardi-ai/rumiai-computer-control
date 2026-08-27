# Phase 9B1 physical validation evidence

Status: `PHYSICALLY_VALIDATED` on the deterministic macOS Cocoa/AppKit dialog fixture.

Validated product:

```text
2e7aaa24572fe5d55262d8cdce7f8fbc06cfaa58
```

Authoritative physical session:

```text
repository: massimilianonardi-ai/rumiai-computer-use-PoCs
session: cc-phase9b1-dialog-observation-s02
evidence commit: 33a5af37e98e93e7321050f23002072ecad2290d
result: 20 PASS / 0 FAIL / 0 BLOCKED
```

The evidence proves that a registered AppKit Provider with no dialog returns an observed empty list; a native `NSAlert` presented as a sheet is observed as canonical `kind=sheet`; message and informative text are preserved; Continue and Cancel buttons and enabled state are observed; unavailable native modal state remains explicit as `null`; and repeated `dialog.list` leaves the sheet present, proving read-only behavior.

Historical session `cc-phase9b1-dialog-observation-s01` remains preserved as FAIL evidence. It failed only because the physical test incorrectly required `modal === true` even when macOS Accessibility did not expose `AXModal`; the product contract already required unavailable state to remain `null` rather than inferred.
