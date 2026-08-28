# Phase 9C3A menu extras observation — physical validation

## Authoritative checkpoint

```text
session: cc-phase9c3a-menu-extras-observation-s01
evidence commit: 5cc824a2209da7ad0de4feaa3cf0eff75ce42e55
validated product: 042d587299852f517022e6792874ec4fae7d826c
test source: f4946f51b39a64e870c5c4a3ee3e73e1cab1e147
poc SHA tested: 71eba71f346a3462b5d358385932ed2b7a943491
result: 34 PASS / 0 FAIL / 0 BLOCKED
reference host: macOS 26.5.2 build 25F84, arm64
```

This checkpoint promotes only the public read-only `menuExtras.observe` capability on the tested macOS Accessibility surface. It validates no menu-extra invocation or mutation.

## What was physically proved

The immutable session ran the complete structure/contract suite and the dedicated physical test against the exact locked product SHA. The physical test:

- used the existing independent native system-chrome topology helper as an oracle rather than the product helper;
- observed the supported OS-owned menu-extra surfaces through macOS Accessibility;
- exercised the real Computer Control runtime and TypeScript SDK through `client.observeMenuExtras()`;
- confirmed that the runtime advertised `menuExtras.observe` as `IMPLEMENTED` before promotion;
- confirmed an `OBSERVED` result containing menu-extra items on the reference host;
- required each public item to contain exactly `title`, `description`, `value` and `enabled`;
- compared stable public semantics against the independent native observation while avoiding byte-for-byte comparison of volatile values such as clock and battery text;
- preserved anonymous native menu-extra nodes as anonymous semantic items instead of assigning guessed identities;
- verified that native owner bundle IDs, `com.apple.menuextra.*` identifiers, AX roles/subroles, action names, AX objects, PIDs and coordinates did not leak into the public result;
- repeated observation to confirm the read-only surface remained observable;
- performed no Accessibility action or attribute mutation and no mouse, keyboard, clipboard, AppleScript or filesystem mutation.

The session result is authoritative because `productShaExpected` and `productShaObserved` were both `042d587299852f517022e6792874ec4fae7d826c`, every recorded test passed, and the runner committed and pushed the evidence as `5cc824a2209da7ad0de4feaa3cf0eff75ce42e55`.

## Semantic boundary retained

The discovery and physical validation observed that native menu extras may advertise actions such as `AXPress` and `AXCancel`. That is delivery capability, not a universal semantic postcondition. Therefore this checkpoint does not introduce or validate `menuExtras.invoke` or any equivalent generic mutation API.

A future semantic mutation must define a narrower intent whose success can be independently observed. Otherwise native action delivery belongs only in the explicit low-level fallback layer and must be represented as delivery rather than semantic success.

## Phase consequence

With this checkpoint, the Phase 9C read-only system-chrome observation surfaces are physically validated on the current macOS reference host:

```text
9C1A application menu bar observation   PHYSICALLY_VALIDATED
9C2A Dock observation                   PHYSICALLY_VALIDATED
9C3A menu extras observation            PHYSICALLY_VALIDATED
```

Phase 9C mutation work remains deliberately separate and is not implied by completion of these observation checkpoints.
