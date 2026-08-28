# Displays API

Phase 9D1 covers global display observation. Phase 9D1A is read-only semantic observation only.

## Phase 9D1A — display list

Public SDK:

```js
client.listDisplays()
```

RPC:

```text
display.list
```

Parameters:

```json
{}
```

Displays are OS-owned global resources, so this operation is not application-scoped.

Result shape:

```json
{
  "state": "OBSERVED",
  "displays": [
    {
      "name": "Built-in Retina Display",
      "bounds": {"x": 0, "y": 0, "width": 1710, "height": 1107},
      "usableBounds": {"x": 0, "y": 56, "width": 1710, "height": 1017},
      "scale": 2,
      "rotationDegrees": 0,
      "primary": true,
      "builtIn": true,
      "active": true,
      "online": true
    }
  ],
  "observation": {"method": "macos-native-display-observation"},
  "backend": {"name": "macos-ax", "strategy": "os-owned-native-display-observation"}
}
```

### Public semantics

- `name` is the OS-visible display name when available;
- `bounds` is the display's logical desktop-space rectangle;
- `usableBounds` is the logical rectangle currently available after OS-reserved chrome such as the menu bar and Dock;
- `scale` is the native backing scale factor exposed by the platform;
- `rotationDegrees` is the observed display rotation;
- `primary` identifies the platform's current main/primary display;
- `builtIn`, `active` and `online` preserve the observed platform state.

Array order is observation order only and is not durable display identity.

### Deliberately private native state

The public contract does not expose `CGDirectDisplayID`, native screen-number handles or other platform display handles. The Phase 9D discovery observed `displayID=1` on the reference host, but one host does not establish a portable or durable public identifier.

The public contract also does not expose a `pixelWidth` / `pixelHeight` claim. On the discovered Retina host the native probe returned `1710x1107` while AppKit reported `backingScaleFactor=2`; therefore the discovery does not justify treating those fields as portable physical-pixel dimensions. Consumers that need screenshots or display targeting will receive a separately validated contract rather than inferring native identity or physical pixels from this observation.

Observation performs no display configuration, mode switch, coordinate action, screenshot capture, mouse/keyboard input, clipboard operation or Accessibility mutation.

### Validation state

Phase 9D1A validation state: `PHYSICALLY_VALIDATED` on the current macOS reference topology.

Authoritative public API checkpoint:

```text
session: cc-phase9d1a-display-observation-s01
evidence: a7788371d7b6d446e783a714112643ba093f2814
validated product: 25c9052c514926f783d6c315cad2e14a5fa55311
test source: a7bd10dc6d522014e1c262a5691ad93c2f5245dd
poc SHA tested: 5d67cd4f3f10c05c31e590698a94809a328a49f4
result: 36 PASS / 0 FAIL / 0 BLOCKED
```

The physical test used an independent AppKit/CoreGraphics oracle and observed exact semantic equality with the public runtime/SDK result. A second public observation returned the same semantic vector. See `docs/evidence/phase9d1a-display-observation-physical.md`.

The validation scope is the current reference topology: one built-in Retina display. The contract is designed to return an array for multi-display systems, but external/multi-monitor, mirroring, rotation and hot-plug combinations remain additional conformance surfaces rather than claims made by this checkpoint.

### Discovery provenance

The contract derives from the earlier authoritative read-only Phase 9D discovery:

```text
session: cc-phase9d-display-clipboard-discovery-s01
evidence: c70e0e581c54ee67d9f56c4400ef3a942012629e
validated discovery product: 6e651f4c226e670ea45ed4b0139b3fe0eff8baac
test source: 68c76aa89d838641baac95abff4f89f47ac96d19
poc SHA tested: cb01e84d7e4901448d584c4075a7d28e97bda65b
result: PASS
```

The discovery remains historical provenance; the later `a7788371...` checkpoint is the authoritative physical validation of `display.list`.
