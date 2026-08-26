# Advanced text controls — Phase 8A

## `ui.getTextSelection`

Phase 8A introduces read-only observation of the native text selection before
Computer Control exposes range mutation APIs.

```js
client.getTextSelection({application, target})
```

Supported macOS reference roles:

- `text-field`;
- `text-area`;
- `search-box`.

The operation is currently `IMPLEMENTED` and awaits physical Cocoa/AppKit
validation.

## Canonical range

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

UTF-16 is explicit rather than implicit. A character outside the BMP therefore
occupies two canonical units. Later range-selection and mutation APIs must use
exactly the same index unit.

## macOS backend

`agent-ctrl 0.1.4` does not expose `AXSelectedTextRange` through its public CLI.
The macOS backend therefore uses a backend-private Swift helper that reads the
real Accessibility attributes from the target process:

- `AXSelectedTextRange`;
- `AXSelectedText`;
- `AXValue` when available for text-length validation.

The helper re-resolves the observed target by canonical role plus accessible
name inside the pinned application process. Zero matches fail stale; multiple
matches fail ambiguous. It never selects a target by coordinates.

The backend validates the native observation before returning it:

- range bounds must be non-negative and internally consistent;
- selected-text UTF-16 length must match the range length when both are
  observable;
- selection end cannot exceed observed text length;
- unsupported roles and unavailable selection state fail explicitly.

## Example result

```json
{
  "state": "OBSERVED",
  "target": {"ref": "@e12", "role": "text-area", "name": "Document"},
  "selection": {
    "start": 1,
    "end": 3,
    "length": 2,
    "collapsed": false,
    "unit": "utf16-code-unit"
  },
  "caret": null,
  "selectedText": "😀",
  "textLength": 7,
  "observation": {
    "method": "macos-ax-selected-text-range",
    "reboundBy": "role-and-accessible-name",
    "indexUnit": "utf16-code-unit"
  },
  "backend": {"name": "macos-ax", "strategy": "native-ax-selected-text-range"}
}
```

## Validation checkpoint

The Phase 8A physical checkpoint must prove at least:

1. a non-empty native AppKit selection;
2. a collapsed caret;
3. selected-text observation;
4. UTF-16 indexing using a non-BMP character;
5. the capability remains `IMPLEMENTED` until that physical evidence is
   committed and reviewed.
