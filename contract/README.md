# Canonical contract

The contract is independent from OS APIs, implementation languages, transports,
and MCP tool dialects.

Version `0.2.0` establishes runtime discovery, observation through `ui.snapshot`
and `ui.find`, and strict verified text replacement through `ui.setText`.

Rules:

1. Never expose native or positional handles as durable identity.
2. Every successful mutating operation carries postcondition evidence.
3. Software faults do not authorize GUI recovery.
4. Synchronization uses observed state rather than arbitrary elapsed time.
5. Unsupported and not-observable are distinct conditions.
6. Capability support is reported per backend and version.
