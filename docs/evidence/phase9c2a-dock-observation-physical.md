# Phase 9C2A Dock observation — physical validation

## Authoritative checkpoint

```text
session: cc-phase9c2a-dock-observation-s02
evidence commit: 5662b659a3b80c236db323dfe09125b56b48eca6
validated product: b9d04f5213c5dcb00ca8dc0363f8248caa9a8916
test source: c928f3dacd3c3456072d21baaef2742e042e5b0d
poc SHA tested: 670cc9bd80d5d7f9fb315669a0f3e30e9f20b758
result: 33 PASS / 0 FAIL / 0 BLOCKED
reference host: macOS 26.5.2 build 25F84, arm64
```

Phase 9C2A is therefore `PHYSICALLY_VALIDATED` on the tested macOS Dock Accessibility surface.

## What was physically validated

The session ran the complete Computer Control contract suite and the dedicated Phase 9C2A physical test through the real local runtime and SDK. The dedicated test used an independent macOS Accessibility oracle before calling the public product API.

On the reference host the oracle resolved exactly one `com.apple.dock` process and observed the native topology:

```text
AXApplication
  -> AXList
     -> AXDockItem ...
```

The physical run observed 45 Dock items. The public `dock.observe` result contained the same item sequence as the independent oracle after canonicalizing only native subrole and visible title to the public semantic representation.

Observed public kinds included:

```text
application: 41
folder:       1
trash:        1
separator:    2
```

The test also verified repeated read-only observation and the expected backend strategy:

```text
macos-os-owned-native-AX-dock-observation
```

## Public/native boundary verified

The public result exposed only:

```text
kind
title
running
status
```

The physical test explicitly verified that the serialized public result did not expose native Accessibility roles/subroles, native action names, `com.apple.dock`, bundle identity, native references, identifiers, coordinates or PIDs.

No Dock action, Accessibility mutation, mouse/keyboard input, clipboard operation or AppleScript was performed.

## Historical s01 evidence remains preserved

The earlier session `cc-phase9c2a-dock-observation-s01` is intentionally retained with overall `FAIL` at evidence commit `3da618a37d813d9cfc3e8003301388a03eea7b20`.

Its dedicated physical Phase 9C2A test itself passed. The overall session failed because the older combined system-chrome discovery contract test still asserted that `dock.observe` must not exist. That assertion was correct during discovery but became stale once Phase 9C2A intentionally introduced the public observation API.

The s02 test-source checkpoint corrected only that lifecycle guard: `dock.observe` is allowed, while `dock.invoke`, `menuExtras.observe`, `menuExtras.invoke` and generic `systemChrome.*` APIs remained forbidden at that checkpoint. The product SHA under physical test did not change between s01 and s02.

Historical evidence is not rewritten; s02 is the authoritative physical validation checkpoint for Phase 9C2A.

## Scope of promotion

This promotion validates read-only Dock observation only. It does not validate or introduce Dock invocation/mutation. Native advertised actions such as `AXPress`, `AXShowMenu` or `AXShowExpose` remain implementation evidence, not a semantic success contract.
