# Local runtime

The runtime will expose the canonical contract through JSON-RPC 2.0 over a
local-only transport:

- macOS/Linux: Unix domain socket;
- Windows: named pipe.

TCP must not be enabled by default. Authentication, peer identity, permission
checks, request limits, audit events, and explicit user consent are runtime
requirements before any remote transport is considered.

Initial lifecycle methods:

- `runtime.info`
- `runtime.ensureReady`
- `runtime.shutdown`

Initial verified interaction:

- `ui.setText`

Initial observation:

- `ui.snapshot`
- `ui.find`

The runtime selects exactly one OS backend and reports its capability matrix.

Start the macOS runtime with:

```text
npm run runtime
```

The default socket is `/tmp/rumiai-computer-control.sock`. Override it with
`RUMIAI_CC_SOCKET`. The runtime loads the macOS Accessibility backend by
default. `RUMIAI_CC_BACKEND_MODULE` can select an alternative compatible module.

Install `agent-ctrl` at `backends/macos/runtime/bin/agent-ctrl` or set its
absolute path through `AGENT_CTRL`.
