# Language SDKs

SDKs are thin, idiomatic clients for the same local Computer Control contract.
They must not independently implement target resolution, verification, recovery,
or fallback policy.

Initial priority follows actual consumers. TypeScript is the first intended SDK
for RumiAI; additional SDKs are added only when there is a concrete consumer.

The initial TypeScript-compatible Node client is in `typescript/src`. It uses no
runtime dependencies and connects only to the configured local socket.
