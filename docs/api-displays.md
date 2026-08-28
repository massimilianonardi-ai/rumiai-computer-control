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

Phase 9D1A validation state: `IMPLEMENTED`.

The contract derives from the authoritative Phase 9D discovery:

```text
session: cc-phase9d-display-clipboard-discovery-s01
evidence: c70e0e581c54ee67d9f56c4400ef3a942012629e
validated discovery product: 6e651f4c226e670ea45ed4b0139b3fe0eff8baac
test source: 68c76aa89d838641baac95abff4f89f47ac96d19
poc SHA tested: cb01e84d7e4901448d584c4075a7d28e97bda65b
result: PASS
```

That checkpoint physically validated the discovery topology only. Promotion of the new public `display.list` implementation to `PHYSICALLY_VALIDATED` requires a dedicated end-to-end runtime/SDK checkpoint.
