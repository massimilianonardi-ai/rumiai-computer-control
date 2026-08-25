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

The standalone macOS implementation owns the promoted v82 backend source and
native helpers. It exposes application, observation, interaction, clipboard,
synchronization, and window operations through a local JSON-RPC runtime and
TypeScript SDK. RumiAI consumes it through `adapters/rumiai/compat.js`; its
high-level production modules no longer import the old in-project facade.

Release `0.8.0` has passed the standalone physical suites and a complete RumiAI
task that created a TextEdit document, inserted exact text, verified both
intents, and shut the external runtime down cleanly.

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
