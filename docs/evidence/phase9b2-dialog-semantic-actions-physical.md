# Phase 9B2 — native dialog semantic actions physical validation

Status: `PHYSICALLY_VALIDATED` on the deterministic macOS Cocoa/AppKit `NSAlert` sheet fixture.

Authoritative physical session:

```text
session: cc-phase9b2-dialog-semantic-actions-s01
evidence commit: 05ddc49834da2a5c6734ecd9904e3bb7051bbc37
validated product: 86421b35f6413c990cebcb76f4357412266d06f7
test source: 14845076651b206b81a41b39948111fa3104ae56
PoC SHA tested: e91dcc8cc7e5143fa1cf9281b9e43d9165deb681
result: 21 PASS / 0 FAIL / 0 BLOCKED
```

Physical environment recorded by the session:

```text
macOS 26.5.2 build 25F84
Apple Swift 6.3.3
arm64
agent-ctrl 0.1.4
macOS Accessibility trusted
```

The evidence proves:

1. `dialog.invokeDefault` and `dialog.invokeCancel` are present as `IMPLEMENTED` in the validated product under test;
2. invoking either action with no dialog present fails closed with `DIALOG_NOT_FOUND`;
3. a real AppKit `NSAlert` sheet is opened through the previously validated native `ui.invoke` path;
4. the default action resolves the native Accessibility default-button relationship and reports `DIALOG_ACTION_COMPLETED` only after independent dialog observation changes from one dialog to zero;
5. the cancel action resolves the native Accessibility cancel-button relationship and reports the same independently verified disappearance postcondition;
6. both operations report `fallback:false` and their native semantic strategies;
7. the public operation does not select a button by label, coordinates or a durable native handle.

Canonical evidence remains in `rumiai-computer-use-PoCs` under the immutable session directory. This file is a stable product-side promotion record and does not replace the source evidence.
