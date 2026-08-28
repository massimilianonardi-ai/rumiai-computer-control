# Phase 10B pointer delivery discovery — physical evidence

## Authoritative checkpoint

```text
session: cc-phase10b-pointer-delivery-discovery-s02
evidence: 4c973a4400660417cfb39fb8297cd363e8c13c63
observed product: 085f0015291419b945540b59a1d56855507f6098
test source: 48f750f7bb22718f713d47c149311178169110ac
poc SHA tested: 45fefdd37f6d0449595ac1e289d09eb3b256f042
result: PASS
```

Reference environment: macOS 26.5.2 build 25F84, arm64, Swift 6.3.3, Accessibility trusted.

## What was physically established

The discovery used a temporary AppKit window and custom `NSView` owned entirely by the test. No user window or user content was used as a click target.

The test physically established all of the following on the reference Mac:

- a Quartz `mouseMoved` event posted at the HID event tap changed the current pointer location to the test target and the location was independently re-read through CoreGraphics;
- exactly one left `mouseDown` and one left `mouseUp` reached the test-owned AppKit view;
- exactly one right `rightMouseDown` and one right `rightMouseUp` reached the same fixture;
- the fixture explicitly pumped the AppKit event queue before asserting delivery;
- the original pointer position was restored before the fixture exited;
- the previously frontmost application was reactivated;
- no user content was clicked;
- the evidence deliberately claims low-level input delivery only, not semantic consequence or application success.

Authoritative markers:

```text
phase10b-pointer-move-delivery=PASS
phase10b-left-button-delivery=PASS down=1 up=1
phase10b-right-button-delivery=PASS down=1 up=1
phase10b-test-owned-fixture=PASS
phase10b-pointer-restored=PASS
phase10b-no-semantic-consequence-claim=PASS
phase10b-user-content-clicked=PASS value=false
physical-phase10b-pointer-delivery-discovery=PASS
```

## Historical failed checkpoint

The earlier session `cc-phase10b-pointer-delivery-discovery-s01`, evidence `47a0895ca5c1df9fc5dfd93c7d01f11275a32a22`, is preserved with `40 PASS / 2 FAIL / 0 BLOCKED`.

It established pointer movement but did not observe button delivery because the test fixture ran the generic run loop without explicitly draining and dispatching the `NSApplication` event queue. It also contained one stale lifecycle assertion that still expected Phase 10A to be `IMPLEMENTED` after its physical promotion. The s02 checkpoint corrected only the test/discovery boundary; the product SHA was unchanged.

## Contract implications

This discovery is sufficient to implement a narrow Phase 10B public fallback surface, but it does not justify semantic click success.

The public contract therefore separates:

- **pointer positioning**: may be called verified only after the current pointer location is independently re-observed at the requested coordinate;
- **button click posting**: may report only that the native down/up sequence was posted after verified positioning. It must not claim that an application accepted the click or that a requested semantic action occurred.

Initial public coordinates are deliberately scoped to the current primary display, local top-left origin, in the same logical coordinate units used by the primary display `bounds` returned from `display.list`. Native display IDs and global desktop arrangement identifiers remain private.

Separate raw `down`/`up` APIs are not introduced by Phase 10B. Held-button state and drag sequences belong to Phase 10C, where the complete compound operation can own cleanup and postconditions.
