# Phase 10E public keyboard physical validation

## Authoritative checkpoint

```text
session: cc-phase10e-keyboard-public-s02
evidence: c5db7fffdccdbcca35e9918c3e547641f98f4059
validated product: e2eb419c352f5996ce45ad6c13b37d7ea52c8c21
test source: cfc8460f31772f5e6f6a10505fbc71fc9f6d8887
poc SHA tested: 852d6a69b9701af8c368e66dad411fb163f0d1f7
result: PASS
```

Historical public s01 evidence `707a97154f652e8e21f2e54f87c61144f996c80a` remains immutable with overall `FAIL`. In s01 the public plain `a` path and Enter path both passed end-to-end, while the shifted result reached `KEY_POSTED` but the independent AppKit oracle did not observe the shifted combination. The forward-only product fix added short internal settling intervals between Shift-down, key-down, key-up and Shift-up, matching the timing pattern already demonstrated by the successful discovery fixture. Two unrelated stale documentation guards were also corrected in the PoC before s02.

## Public path exercised

The authoritative s02 used the real runtime and TypeScript SDK `ComputerControlClient.pressKey()` against a separate test-owned AppKit `NSTextView` oracle. The fixture did not synthesize keyboard input; it only became first responder and observed events and consequences produced by the product.

The following canonical tuples were exercised:

```text
key="a", modifiers=[]
key="enter", modifiers=[]
key="a", modifiers=["shift"]
```

For the plain key, the public result passed the `KEY_POSTED` delivery-only boundary and the independent fixture observed exactly one key-down and one key-up plus the lowercase text consequence.

For Enter, the public result passed the same boundary and the independent fixture observed exactly one key-down and one key-up plus a newline consequence.

For Shift+A, the public result passed the delivery-only boundary and the independent fixture observed exactly one Shift-on transition, one Shift-off transition, exactly one shifted A key-down and one shifted A key-up plus the uppercase text consequence.

## Safety and privacy observations

The authoritative run also established:

- no emergency modifier release was required on PASS;
- the previously frontmost application was restored;
- the fixture was entirely test-owned and no user content was touched;
- numeric native virtual-key codes were not present in public results or evidence markers;
- user text was not persisted in evidence markers;
- the public result kept `semanticConsequenceVerified:false` even though the independent test oracle observed a consequence.

## Contract boundary

This checkpoint validates the implementation of the closed Phase 10E vocabulary on the current macOS reference surface. It does not turn raw keyboard delivery into semantic success and does not generalize to untested keys or modifier combinations.

The public capability remains intentionally atomic: there is no public key-down, key-up or held-modifier state. Numeric virtual-key identities remain backend-private and are selected internally using symbolic platform constants.

A semantic Computer Control operation remains preferred whenever one can satisfy the task. `keyboard.press` is only an explicit low-level fallback.
