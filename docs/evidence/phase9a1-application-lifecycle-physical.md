# Phase 9A1 physical validation

Phase 9A1 provider-scoped application inventory, launch and activation is physically validated on macOS Cocoa/AppKit.

Evidence repository: `massimilianonardi-ai/rumiai-computer-use-PoCs`

```text
session: cc-phase9a1-application-lifecycle-s01
evidence commit: 8f75ba73c1443842b8b8f29e9cd9fd67cddb4b79
validated product: 5e36c5fd098ac50f80e439f1bb4e778e73c3fd86
test source: fbf5d3e2c0eee168327bf4d1517d11551a762295
session source: 1e9f407a42f8f9ed27b44812af70e25a0158eb36
result: 18 PASS / 0 FAIL / 0 BLOCKED
```

The physical fixture proved:

- the registered Provider is listed as available and not running before launch;
- activation of a stopped application fails `APP_NOT_RUNNING` and does not launch it;
- launch starts the exact registered bundle and verifies a running process postcondition;
- repeated launch is idempotent;
- activation moves the exact registered bundle to the foreground and verifies the foreground postcondition;
- repeated activation is idempotent;
- subsequent inventory reflects the running and active state.

This validation is scoped to the tested macOS/AppKit backend and does not imply cross-platform validation.
