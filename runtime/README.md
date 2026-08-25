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

The runtime selects exactly one OS backend and reports its capability matrix.
