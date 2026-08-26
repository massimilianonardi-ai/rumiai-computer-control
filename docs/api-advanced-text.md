# Advanced text controls — Phase 8

## Phase 8A — `ui.getTextSelection`

Phase 8A exposes read-only observation of native caret and text selection.

```js
client.getTextSelection({application, target})
```

Supported macOS reference roles:

- `text-field`;
- `text-area`;
- `search-box`.

Phase 8A is `PHYSICALLY_VALIDATED` on Cocoa/AppKit. The authoritative physical
evidence is test-repository commit
`faf24053aa8b9b31abc7f3ac730941921c3625f9`, produced against product revision
`4166cab8c6b535d627c0f93fe0015ad3c69fcc6a` with 14 PASS, 0 FAIL and 0 BLOCKED.
The checkpoint covers a non-empty selection containing a non-BMP character and
a collapsed caret.

## Canonical text indexing

Computer Control exposes text positions as UTF-16 code-unit offsets:

```json
{
  "start": 1,
  "end": 3,
  "length": 2,
  "collapsed": false,
  "unit": "utf16-code-unit"
}
```

Rules:

- offsets are zero-based;
- `end` is exclusive;
- `length == end - start`;
- a caret is represented by `start == end`, `length == 0`, `collapsed == true`;
- `caret` equals `start` only for a collapsed selection, otherwise it is `null`;
- `selectedText` is returned when the native backend exposes it;
- `textLength` is the observed full-text UTF-16 length when available;
- raw `NSRange`, `AXTextMarkerRange`, UIA TextRange or AT-SPI objects never cross
  the canonical boundary.

A character outside the BMP occupies two canonical units. Every Phase 8 range
operation uses this same explicit unit.

For text mutation, a start or end boundary that falls inside a UTF-16 surrogate
pair fails with `TEXT_RANGE_SPLITS_SURROGATE`. Computer Control never performs a
text write that would deliberately create an invalid Unicode scalar sequence.

## Phase 8B — `ui.selectTextRange`

Phase 8B selects or collapses a native text range without using keyboard,
clipboard or coordinates.

```js
client.selectTextRange({
  application,
  target,
  range: {start: 3, end: 5, unit: "utf16-code-unit"}
})
```

The request intentionally contains only the independent fields `start`, `end`
and `unit`. `length` and `collapsed` are derived by Computer Control and cannot
contradict the request.

Phase 8B is `PHYSICALLY_VALIDATED` on Cocoa/AppKit. The authoritative evidence is
`rumiai-computer-use-PoCs` commit
`c1cbab943cd2885ee9f62098cc23f1b903dc4dee`, generated against product revision
`778c39e3358295ba18b0bbfd0705858f6902a15d`. The session recorded 15 PASS,
0 FAIL and 0 BLOCKED and proved non-empty selection, idempotence, collapsed caret,
UTF-16 behavior and out-of-bounds rejection without corrupting the selection.

### macOS range-selection strategy

The macOS backend:

1. describes the current ephemeral target;
2. safely re-resolves the native text element inside the pinned application
   process by role plus accessible name;
3. observes the current selection and full UTF-16 text length;
4. returns idempotently if the requested range is already selected;
5. rejects an observed out-of-bounds request before mutation;
6. checks that `AXSelectedTextRange` is settable;
7. writes a real `CFRange` through `AXUIElementSetAttributeValue`;
8. immediately verifies the native value in the helper;
9. performs a second, independent AX observation and requires an exact range
   match.

The backend-private role compatibility retry is limited to `text-field` ↔
`text-area` and only occurs after `TEXT_TARGET_STALE`. Permission, ambiguity,
mutation and verification errors never trigger a looser fallback.

## Phase 8C — precise text mutation

Phase 8C introduces three distinct operations:

```js
client.replaceTextRange({
  application,
  target,
  range: {start: 3, end: 5, unit: "utf16-code-unit"},
  text: "replacement"
})

client.insertText({application, target, text: "inserted"})
client.appendText({application, target, text: " appended"})
```

Status: `IMPLEMENTED`; physical Cocoa/AppKit validation is required before any
8C capability is promoted.

### Canonical semantics

`ui.replaceTextRange`

- replaces exactly `[start,end)`;
- allows `text: ""` for precise deletion;
- rejects out-of-bounds ranges before mutation;
- rejects a range boundary inside a UTF-16 surrogate pair;
- leaves a deterministic collapsed caret immediately after the replacement.

`ui.insertText`

- inserts only at the currently observed caret;
- requires the observed selection to be collapsed;
- fails with `CARET_REQUIRED` when a non-empty selection exists rather than
  silently replacing it;
- leaves the caret immediately after the inserted text.

`ui.appendText`

- derives the exact observed UTF-16 text end;
- appends there regardless of the current selection;
- leaves the caret at the new text end.

All three operations accept an empty string. When both text and final selection
are already equal to the requested result, the operation is a verified
idempotent no-op.

### macOS mutation strategy

The Cocoa/AppKit reference backend uses native Accessibility only:

1. observe the target, full text, selection and text length;
2. validate UTF-16 bounds and Unicode boundary safety before mutation;
3. re-resolve the native editable element by role plus accessible name;
4. verify `AXSelectedTextRange` and `AXSelectedText` are settable;
5. set the exact native selected range;
6. write the replacement through `AXSelectedText` using
   `AXUIElementSetAttributeValue`;
7. immediately compare the native full `AXValue` with the exact expected text;
8. set a deterministic collapsed final caret through the already validated 8B
   range primitive;
9. independently re-observe the full text, UTF-16 length and final caret;
10. report success only if both text and selection postconditions match exactly.

Keyboard, clipboard, coordinates, Safari/WebKit and browser-document automation
are not Phase 8C delivery strategies.

### Verified result

The three operations share `text-mutation-result.schema.json` and return:

- `state: "TEXT_MUTATED"`;
- the canonical operation name;
- the requested/derived range;
- replacement UTF-16 length;
- previous and resulting text lengths;
- the resulting collapsed selection and caret;
- independent `textChanged`, `selectionChanged`, `changed` and `idempotent`
  flags;
- semantic verification evidence;
- backend strategy and diagnostics.

The full text is deliberately not copied into the public result. It is observed
internally to prove the exact postcondition.

## Phase 8C physical checkpoint

The deterministic Cocoa/AppKit checkpoint must prove at least:

1. exact replacement of a non-empty range in a real `NSTextView`;
2. Unicode/non-BMP replacement with correct UTF-16 lengths and final caret;
3. insertion at a collapsed native caret;
4. `CARET_REQUIRED` on a non-empty selection without altering the text;
5. append at the exact observed text end regardless of current selection;
6. precise deletion using an empty replacement;
7. rejection of a range boundary inside the existing emoji surrogate pair
   without altering the text;
8. independent full-text and caret postconditions after each successful write;
9. all Phase 8C capabilities remain `IMPLEMENTED` until the physical evidence
   commit is reviewed.

Phase 9 must not use Phase 8C as physically validated until this checkpoint has
produced and committed a real AppKit PASS.
