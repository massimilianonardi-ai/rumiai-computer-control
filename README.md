# RumiAI Computer Control

RumiAI Computer Control is the standalone, backend-neutral desktop control layer used by RumiAI and other local clients.

The project owns the canonical semantics of observation, interaction, synchronization, verification, errors, and capability discovery. Operating system backends own the mechanics required to satisfy that contract.

## Architectural rule

```text
LLM decides WHAT
resolver decides WHICH target
Computer Control/backend decides HOW
```

Backend command success is not public operation success. Public operations are postcondition-oriented and must return verification evidence.

## Repository layout

- `contract/`: versioned, language-neutral API schemas and examples.
- `runtime/`: local service lifecycle and transport.
- `backends/`: macOS, Windows, and Linux implementations.
- `sdk/`: thin language clients; business semantics do not live here.
- `adapters/`: integrations such as MCP and RumiAI.
- `docs/`: architecture, versioning, installation and security decisions.

## Status

The standalone macOS Accessibility implementation exposes application, observation, interaction, clipboard, synchronization and window operations through a local JSON-RPC runtime and TypeScript SDK. RumiAI consumes it through `adapters/rumiai/compat.js`.

`main` is developing contract `0.9.0`. `ui.describe` and `ui.invoke` remain physically validated. `ui.toggle` and `ui.select` are now implemented with explicit state postconditions and are awaiting external boundary/physical validation. The latest tagged release remains `v0.8.0`; no 0.9.0 release claim is made before those tests pass.

See the [API reference](docs/api.md), [stateful-controls development reference](docs/api-stateful-controls.md), [native controls roadmap](docs/native-controls-roadmap.md) and [architecture](docs/architecture.md).

## Initial technical direction

- Local JSON-RPC 2.0 boundary.
- Unix domain sockets on macOS/Linux and named pipes on Windows.
- Native OS backends: macOS Accessibility, Windows UI Automation, Linux AT-SPI.
- Semantic-first actions; mouse, coordinates, screenshots, and vision are progressively lower-priority fallbacks.
- MCP is an adapter, not the internal Computer Control contract.

## Installation

Release `v0.8.0` includes a macOS installer that requires an explicit portable project root, creates a versioned project-local installation, verifies the downloaded backend dependency, compiles native helpers, and exposes a stable `current` path. It never defaults to a system or user-profile location. See `docs/installation.md`.
