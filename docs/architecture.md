# Architecture

## Boundaries

```text
Semantic layer
      |
Skills / Executors
      |
RumiAI adapter / language SDK
      |
Canonical Computer Control contract
      |
Local runtime
      |
OS backend
      |
Operating system
```

RumiAI owns intent and orchestration. Computer Control owns normalized,
verified computer mechanics. The backend owns OS-specific execution.

## Result-oriented operations

Public mutation success requires independent postcondition evidence. A native
API accepting a command is insufficient. The result envelope records the state,
verification method, backend strategy, fallback use, errors, and diagnostics.

## Target identity

The public API uses semantic descriptors. Native objects, accessibility paths,
array indices, PIDs combined with positional indices, and screen coordinates are
not durable public identity. Backends may use them as ephemeral action handles
after fresh observation and resolution.

## Strategy order

1. semantic OS action;
2. direct value/action API;
3. accessibility element interaction;
4. keyboard/mouse input;
5. runtime-derived coordinates;
6. vision.

## Language model

One backend implementation exists per OS integration, not per consumer language.
SDKs remain thin and share the same versioned contract. This prevents semantic
drift across Python, TypeScript, Swift, .NET, and Rust clients.

## MCP

MCP is an edge adapter and Nervo protocol option. It may expose capabilities to
external agents but cannot become the internal definition of Computer Control.
