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

The runtime selects exactly one OS backend and reports its capability matrix.

Start the current macOS transition runtime with:

```text
npm run runtime
```

The default socket is `/tmp/rumiai-computer-control.sock`. Override it with
`RUMIAI_CC_SOCKET`. Override the validated legacy module location with
`RUMIAI_CC_LEGACY_MODULE`.
