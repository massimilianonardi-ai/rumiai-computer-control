# Computer Control API reference

This document describes the 29 public Computer Control operations implemented
by release `0.8.0`.

## Implementation status

| Platform | Backend | Status |
| --- | --- | --- |
| macOS | Accessibility (`macos-ax`) | Implemented and physically validated |
| Windows | UI Automation | Proposed; not implemented |
| Linux | AT-SPI/D-Bus | Proposed; not implemented |

The current runtime starts only on macOS. Applications presently registered by
the macOS Provider Registry are Finder, Pulsar, Safari, System Settings and
TextEdit. System Settings also accepts its English and Italian legacy names.

## Accessing the API

Computer Control uses newline-delimited JSON-RPC 2.0 over a local Unix socket.
The default socket is `/tmp/rumiai-computer-control.sock`; it can be changed with
`RUMIAI_CC_SOCKET`. The socket is created with mode `0600` and each request is
limited to 1 MiB.

The TypeScript-compatible Node.js SDK is exposed by
`sdk/typescript/src/index.js`:

```js
const {ComputerControlClient} = require("./sdk/typescript/src");

const client = new ComputerControlClient({
  socketPath:"/tmp/rumiai-computer-control.sock",
  timeoutMs:15000,
});

const info = await client.runtimeInfo();
```

The RumiAI synchronous adapter in `adapters/rumiai/compat.js` maps the same
canonical operations to RumiAI's `{app, element}` calling convention. It does
not define additional backend semantics. The MCP directory currently documents
the intended adapter boundary but does not yet contain an implemented MCP
server or tools.

A raw request contains one JSON object followed by a newline:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "runtime.info",
  "params": {}
}
```

## Common values

### Application

`application` is a registered application name or alias, for example
`"TextEdit"` or `"System Settings"`. It is not a bundle path or process ID.

### Actionable element

An actionable target is obtained from `ui.snapshot` or `ui.find`:

```json
{
  "ref": "@e12",
  "role": "text-area",
  "name": "Document"
}
```

An `@e` reference is an observation-scoped handle. It must not be persisted or
treated as durable identity. Re-observe the application before a later action.

### Window descriptor

Window observation returns:

```json
{
  "id": "123:0",
  "title": "Document.txt",
  "process": "TextEdit",
  "pid": 123,
  "bundle": "com.apple.TextEdit"
}
```

Window IDs are also ephemeral. Mutating window operations require the complete
fresh descriptor and re-resolve it before acting.

### Verified result

Mutating operations normally return a result envelope containing:

```json
{
  "ok": true,
  "state": "VERIFIED",
  "verified": true,
  "verification": {
    "method": "ax-text-exact",
    "evidence": {}
  },
  "backend": {
    "name": "macos-ax",
    "strategy": "ax-fill",
    "fallback": false
  },
  "diagnostics": {}
}
```

`verified: true` always describes the verification named in `verification`.
For `ui.click`, `ui.press`, `clipboard.copy` and `clipboard.paste`, this proves
delivery to the backend, not the application-level consequence. Observe the
resulting state with `ui.snapshot`, `ui.get` or a synchronization operation.

## Runtime lifecycle APIs

| JSON-RPC method | SDK method | Parameters | What it does |
| --- | --- | --- | --- |
| `runtime.info` | `runtimeInfo()` | None | Reports contract/runtime/backend versions, platform and the runtime capability matrix. |
| `runtime.ensureReady` | `ensureReady()` | None | Starts or reuses the local backend session and returns `READY` with readiness evidence. |
| `runtime.shutdown` | `shutdownRuntime()` | None | Stops the backend session. The operation is idempotent and returns `STOPPED`. |

## Application APIs

| JSON-RPC method | SDK method | Parameters | What it does |
| --- | --- | --- | --- |
| `application.ensureReady` | `ensureApplicationReady({application, timeoutMs?})` | Registered `application`; optional timeout | Resolves or starts the application, brings it into a controllable state and proves readiness with an observed accessibility snapshot. |
| `application.getForeground` | `getForeground()` | None | Observes the actual foreground application and returns its name, bundle identifier and PID when available. |

## UI observation and interaction APIs

| JSON-RPC method | SDK method | Required parameters | What it does |
| --- | --- | --- | --- |
| `ui.snapshot` | `snapshot(...)` | `application` | Observes the accessibility tree. `compact` defaults to `true`; `settle` can wait for a stable surface; `previousSnapshot` enables change reporting. Returns text plus parsed actionable nodes. |
| `ui.find` | `find(...)` | `application` and at least one of `query` or `role` | Finds enabled semantic elements. It first uses a supplied snapshot when present, then the backend. `first:false` returns all matches. Matching is normalized, exact-first and then substring-based. |
| `ui.get` | `get(...)` | `application`, `target`, `property` | Reads an element property. The macOS backend currently exposes `text` and `value`. |
| `ui.getBounds` | `getBounds(...)` | `application`, `target` | Observes element geometry as `{x, y, width, height}`. |
| `ui.focus` | `focus(...)` | `application`, `target` | Delivers focus to an actionable element. The result states whether the semantic focus consequence was independently observed. |
| `ui.click` | `click(...)` | `application`, `target` | Delivers a semantic accessibility click, with an observed-bounds pointer fallback when required. `settle` defaults to `true`. |
| `ui.press` | `press(...)` | `application`, `keys` | Delivers a key or chord such as `"Right"` or `"Cmd+S"`. `settle` defaults to `true`; the caller must observe the semantic consequence. |
| `ui.setText` | `setText(...)` | `application`, `target`, non-empty `text` | Replaces editable text and verifies exact equality. Strategies can include AX fill, clipboard paste and typing. Empty text is rejected; use `ui.clear`. |
| `ui.clear` | `clear(...)` | `application`, `target` | Clears editable text and verifies that the observed value is exactly empty. |

Example:

```js
await client.ensureApplicationReady({application:"TextEdit"});

const snapshot = await client.snapshot({
  application:"TextEdit",
  settle:true,
});

const found = await client.find({
  application:"TextEdit",
  role:"text-area",
  snapshot:snapshot.snapshot,
});

await client.setText({
  application:"TextEdit",
  target:found.target,
  text:"Ciao RumiAI.",
});
```

## Clipboard APIs

| JSON-RPC method | SDK method | Parameters | What it does |
| --- | --- | --- | --- |
| `clipboard.read` | `readClipboard()` | None | Reads and returns the current system clipboard text. |
| `clipboard.write` | `writeClipboard(text)` | String `text` | Writes the clipboard and verifies exact readback. Empty text is allowed. |
| `clipboard.copy` | `copy()` | None | Delivers the platform copy chord to the focused application. It does not prove which semantic object was copied. |
| `clipboard.paste` | `paste()` | None | Delivers the platform paste chord to the focused application. It does not prove the resulting application value. |

## Synchronization APIs

| JSON-RPC method | SDK method | Parameters | What it does |
| --- | --- | --- | --- |
| `sync.waitStable` | `waitStable(...)` | `application`; optional `timeoutMs`, `pollMs` | Re-observes the application until its accessibility state is stable. Defaults: 5000 ms timeout and 200 ms polling. |
| `sync.waitUntilChanged` | `waitUntilChanged(...)` | `application`, `previousSnapshot`; optional `timeoutMs`, `pollMs`, `compact` | Waits until a semantically equivalent snapshot differs from the supplied observation. Defaults: 12000 ms timeout and 300 ms polling. |

These operations are state-driven. Callers should use them instead of fixed
sleeps when an application update can be observed.

## Window APIs

| JSON-RPC method | SDK method | Required parameters | What it does |
| --- | --- | --- | --- |
| `window.list` | `listWindows(application)` | `application` | Observes all current windows for the resolved application. |
| `window.getCurrent` | `getCurrentWindow(application)` | `application` | Observes the physically focused window and verifies that it belongs to the requested application. |
| `window.focus` | `focusWindow(application, window)` | `application`, fresh `window` descriptor | Focuses the exact physical window and verifies the focused-window descriptor. |
| `window.close` | `closeWindow(application)` | `application` | Closes the application's current window and verifies that the targeted physical window is no longer present. |
| `window.minimize` | `minimizeWindow(application, window)` | `application`, fresh `window` descriptor | Sets the native minimized state and verifies it by re-observation. |
| `window.restore` | `restoreWindow(application, window)` | `application`, fresh `window` descriptor | Clears the native minimized state and verifies it by re-observation. |
| `window.maximize` | `maximizeWindow(application, window)` | `application`, fresh `window` descriptor | Maximizes the window and verifies its resulting bounds. |
| `window.move` | `moveWindow(application, window, position)` | `application`, fresh `window`, finite `{x, y}` | Moves the window and verifies the requested position. |
| `window.resize` | `resizeWindow(application, window, size)` | `application`, fresh `window`, positive `{width, height}` | Resizes the window and verifies the requested dimensions. |

All window mutations fail closed when the observed descriptor is incomplete,
stale or ambiguous. A result can report `handleRebound:true` when the backend
safely re-resolved a new ephemeral action handle for the same physical window.

## Errors

Transport-level operation failures use JSON-RPC error code `-32000`. Canonical
details are returned in `error.data`:

```json
{
  "code": "ELEMENT_NOT_FOUND",
  "message": "No enabled element found",
  "recoveryPolicy": "NONE",
  "details": {}
}
```

The SDK rejects the call with an `Error` carrying `code`, `recoveryPolicy` and
`details`. Invalid requests, missing applications, stale handles, unsupported
properties, observation failures and unverified postconditions remain distinct
error conditions. Computer Control does not authorize GUI recovery for a
software or contract error.

## Capability discovery

Do not infer support from the operating system or package version. Call
`runtime.info` and inspect each capability's `available`, `validationState` and
`strategies` fields. The lifecycle operations `runtime.ensureReady` and
`runtime.shutdown` are always part of the runtime contract but are not separate
entries in the capability matrix.
