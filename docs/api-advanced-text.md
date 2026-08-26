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

Phase 8B is currently `IMPLEMENTED` and requires its physical Cocoa/AppKit
checkpoint before promotion.

### macOS strategy

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
9. performs a second, independent `ui.getTextSelection`-equivalent AX
   observation and requires an exact range match.

The backend-private role compatibility retry is limited to `text-field` ↔
`text-area` and only occurs after `TEXT_TARGET_STALE`. Permission, ambiguity,
mutation and verification errors never trigger a looser fallback.

### Example result

```json
{
  "ok": true,
  "state": "TEXT_RANGE_SELECTED",
  "verified": true,
  "target": {"ref": "@e12", "role": "text-area", "name": "Document"},
  "requestedRange": {
    "start": 3,
    "end": 5,
    "length": 2,
    "collapsed": false,
    "unit": "utf16-code-unit"
  },
  "previousRange": {
    "start": 1,
    "end": 3,
    "length": 2,
    "collapsed": false,
    "unit": "utf16-code-unit"
  },
  "observedRange": {
    "start": 3,
    "end": 5,
    "length": 2,
    "collapsed": false,
    "unit": "utf16-code-unit"
  },
  "caret": null,
  "selectedText": "BC",
  "changed": true,
  "idempotent": false,
  "verification": {
    "method": "native-ax-selected-text-range-postcondition"
  },
  "backend": {
    "name": "macos-ax",
    "strategy": "macos-ax-set-selected-text-range",
    "fallback": false
  }
}
```

## Phase 8B physical checkpoint

The physical checkpoint must prove at least:

1. selection of a non-empty range on a real `NSTextView`;
2. exact selected-text observation after the write;
3. idempotent re-selection of the same range;
4. collapse to a caret by requesting `start == end`;
5. UTF-16 behavior remains correct around the existing non-BMP fixture;
6. the capability remains `IMPLEMENTED` until the evidence commit is reviewed.

Phase 8C range mutation, insertion and append must not be promoted on assumptions
from 8B; it starts only after this checkpoint is physically validated.
