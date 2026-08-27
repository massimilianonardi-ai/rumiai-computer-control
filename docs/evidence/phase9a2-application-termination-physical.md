# Phase 9A2 graceful application termination — physical evidence

Status: `PHYSICALLY_VALIDATED` on the deterministic macOS Cocoa/AppKit lifecycle fixture.

Evidence source:

```text
repository: massimilianonardi-ai/rumiai-computer-use-PoCs
session: cc-phase9a2-application-terminate-s01
evidence commit: e58549c9492a300581e8e6fd13f859bebfb7c3f3
validated product: 2c99a708a5c78262a0df1c2d9bbbdc18cf72932a
result: 19 PASS / 0 FAIL / 0 BLOCKED
```

The physical session proves that `application.terminate`:

- succeeds idempotently when the Provider application is already stopped;
- requests graceful termination by exact resolved bundle identity using `NSRunningApplication.terminate()`;
- reports `APPLICATION_TERMINATED` only after the target process is independently observed absent;
- leaves `application.list` with `running:false` and `active:false` after successful termination;
- remains idempotent on repeated termination;
- returns `APP_TERMINATION_NOT_COMPLETED` when an AppKit fixture refuses termination;
- leaves the refusing application physically running;
- does not escalate to force-kill or answer application dialogs automatically.

The validation is scoped to macOS Cocoa/AppKit and the Provider-scoped application lifecycle surface. It does not assert equivalent validation for other platform backends.
