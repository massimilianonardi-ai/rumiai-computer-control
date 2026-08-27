# Phase 9B3A — native file picker observation physical evidence

Authoritative physical validation:

```text
session: cc-phase9b3a-file-picker-observation-s01
evidence commit: 63a2b850a2c1dcf8509a27e7f8292a1f09f811ba
validated product: c26552046ae0cc18b76ab33d6a24af98b0e68cde
test source: 4ffbe2c0790d0e9ba4fc5019634f3a5c7cc0bc64
poc sha tested: c0c323261acd20ed9cc4e8bc1f4717e270c36e01
result: 23 PASS / 0 FAIL / 0 BLOCKED
macOS: 26.5.2 (25F84), arm64
```

The deterministic Cocoa/AppKit session proved:

- `filePicker.observe` returns the ordinary read-only state `picker:null` when no native picker is open;
- a real `NSOpenPanel` is observed through the registered Provider process without exposing PID or AX identity publicly;
- visible location is observed as `PickerRoot`;
- `Alpha.txt` and `Beta.txt` are observed as enabled files;
- `FolderA` is observed as an enabled directory;
- selection state is explicit and initially false for all reference items;
- a repeated observation preserves the picker and its items unchanged;
- the capability remained read-only throughout the session.

This evidence validates only the Phase 9B3A observation contract on the tested macOS/AppKit reference surface. Navigation/selection and accept/cancel remain separate checkpoints.
