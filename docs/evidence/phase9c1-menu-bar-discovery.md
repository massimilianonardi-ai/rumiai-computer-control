# Phase 9C1 menu bar discovery evidence

## Canonical discovery checkpoint

```text
session: cc-phase9c1-menu-bar-discovery-s02
evidence commit: fe203eceec6a3976c911786860b8803794d6880a
product: ebce7c87c264932144909a491d04c7f307b4cafe
test source: 72790fd9dbd8142ff71f34d823443dea107fd382
poc SHA tested: 3d94c6d393508cf0991d5b0c8c2b1490c748ce9d
result: 30 PASS / 0 FAIL / 0 BLOCKED
reference host: macOS 26.5.2 build 25F84, arm64
```

Historical session `cc-phase9c1-menu-bar-discovery-s01` remains immutable. It failed before the native topology probe because the physical harness incorrectly expected a `running` field on the already verified `ensureApplicationReady` result. That harness defect was corrected without changing Computer Control.

## Physically observed AppKit Accessibility topology

On the reference fixture, the registered Provider application AX object exposes `kAXMenuBarAttribute`, and the resolved element has role `AXMenuBar`.

The complete menu tree is Accessibility-visible while menus are closed. The deterministic fixture branch was observed as:

```text
RumiAI Actions                  AXMenuBarItem
├── Alpha Action               AXMenuItem
├── Disabled Action            AXMenuItem
└── Nested Group               AXMenuItem
    └── Nested Action          AXMenuItem
```

`RumiAI Actions`, `Alpha Action`, `Disabled Action`, and `Nested Action` were all present in the read-only discovery tree without opening a menu. Menu-bar items and menu items advertised native actions including `AXPress`/`AXPick`; no action was performed during discovery.

The reference menu bar also exposed the Apple menu and application menu under the same Provider-scoped `AXMenuBar` tree. Their presence is observation data, not public native identity.

## Enabled-state discovery caveat

The first fixture used the default `NSMenu.autoenablesItems` behavior. Although its `Disabled Action` was assigned `isEnabled = false`, AppKit menu validation re-enabled the item because it had a valid target/action, so discovery observed it as enabled. This is a fixture issue, not an Accessibility inference issue.

The public 9C1A physical fixture therefore disables automatic menu-item enabling (`autoenablesItems = false`) so enabled/disabled observation can be validated deterministically.

## Contract consequences

- Phase 9C1A can observe the application menu bar directly from the exact registered Provider process; no global desktop scan is required.
- Closed-menu observation is sufficient on the validated AppKit surface; opening menus is not required merely to enumerate the tree.
- public observation should expose semantic title, enabled state, and hierarchy only;
- AX roles, identifiers, action lists, element handles, coordinates, and process identifiers remain backend-private;
- menu-bar invocation is intentionally separate from 9C1A because generic menu commands have heterogeneous side effects and require a postcondition model stronger than successful `AXPress` delivery.
