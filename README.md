# RumiAI Computer Control

RumiAI Computer Control is the standalone, backend-neutral desktop control
layer used by RumiAI and other local clients.

The project owns the canonical semantics of observation, interaction,
synchronization, verification, errors, and capability discovery. Operating
system backends own the mechanics required to satisfy that contract.

## Architectural rule

```text
LLM decides WHAT
resolver decides WHICH target
Computer Control/backend decides HOW
```

Backend command success is not public operation success. Public operations are
postcondition-oriented and must return verification evidence.

## Repository layout

- `contract/`: versioned, language-neutral API schemas and examples.
- `runtime/`: local service lifecycle and transport.
- `backends/`: macOS, Windows, and Linux implementations.
- `sdk/`: thin language clients; business semantics do not live here.
- `adapters/`: integrations such as MCP and RumiAI.
- `conformance/`: shared contract and physical validation suites.
- `docs/`: architecture, workflow, versioning, and security decisions.

## Status

This repository is initially a product scaffold. Code from
`rumiai-computer-use-PoCs` is promoted here only after its boundary and physical
tests pass. Existing PoC code is not automatically considered production code.

The first vertical slice now provides `runtime.info`, runtime lifecycle, and
strict verified `ui.setText` through a local JSON-RPC runtime and TypeScript SDK.
The macOS implementation is an explicitly temporary bridge to the v46 validated
backend while native code is extracted behind the same contract.

## Initial technical direction

- Local JSON-RPC 2.0 boundary.
- Unix domain sockets on macOS/Linux and named pipes on Windows.
- Native OS backends: macOS Accessibility, Windows UI Automation, Linux AT-SPI.
- Semantic-first actions; mouse, coordinates, screenshots, and vision are
  progressively lower-priority fallbacks.
- MCP is an adapter, not the internal Computer Control contract.

See `docs/architecture.md` and `docs/development-workflow.md`.

## Checks

```text
npm run check
```
