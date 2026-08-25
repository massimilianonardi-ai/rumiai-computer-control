# Promotion record: v46 strict setText equality

Source laboratory: `rumiai-computer-use-PoCs`

Source evidence: `tests/v46-strict-settext-equality-PASS.md`

Validated behavior:

```text
method=ax-fill
verified=true
verification=ax-text-exact
```

The initial product promotion preserves this behavior through a transition
backend and adds a new boundary:

```text
TypeScript SDK -> local JSON-RPC -> Computer Control runtime
  -> macOS validated transition backend -> exact postcondition evidence
```

The original operation is physically validated. The new end-to-end RPC path is
not classified as physically validated until
`conformance/physical-tests/macos-set-text-v46.js` passes on the target Mac.

Accordingly, runtime capability discovery reports `BOUNDARY_PASS`. The source
v46 evidence is preserved separately and does not automatically validate the
new transport boundary.

The transition backend is deliberately named and must not be confused with the
future standalone Swift macOS backend.
