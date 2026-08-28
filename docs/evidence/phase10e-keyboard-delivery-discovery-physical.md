# Phase 10E keyboard delivery discovery — physical evidence

## Authoritative checkpoint

```text
session: cc-phase10e-keyboard-delivery-discovery-s01
evidence: 1aa6efa523dab83d7dd5e2b14fb1b6deb83dc324
observed product: 0f4d2c0378b12df50ed192721dded97edff9f72e
test source: fd462455a0b989b459d63d5a3d5833420a191d2f
poc SHA tested: ddd7f69cffe3b2eed67b9e3dfc2a7bd57179d589
result: PASS
```

Reference surface: macOS 26.5.2 build 25F84, arm64, Swift 6.3.3, Accessibility trusted.

## What was physically established

A test-owned AppKit text fixture was made first responder and synthetic Quartz keyboard events were delivered only to that fixture.

The fixture independently observed:

- canonical printable-key probe: one key-down and one key-up, with the expected lowercase text consequence;
- canonical special-key probe: one key-down and one key-up, with a real newline consequence;
- Shift-modified printable-key probe: one Shift-on flags transition, one Shift-off flags transition and one shifted key observation, with the expected uppercase text consequence;
- clean modifier release at the end of the probe;
- restoration of the previously frontmost application.

The physical session markers were:

```text
phase10e-printable-key-delivery=PASS down=1 up=1
phase10e-printable-text-consequence=PASS
phase10e-special-key-delivery=PASS down=1 up=1
phase10e-special-key-consequence=PASS
phase10e-shift-modifier-delivery=PASS on=1 off=1 shifted=1
phase10e-shifted-text-consequence=PASS
phase10e-keyboard-clean-release=PASS
phase10e-frontmost-app-restored=PASS
phase10e-test-owned-fixture=PASS
phase10e-native-keycode-logging=PASS numericKeycodesLogged=false userTextLogged=false
physical-phase10e-keyboard-delivery-discovery=PASS
```

## Native/private mapping discovered

The discovery implementation used symbolic platform constants internally for the printable A key, Return and Shift. Numeric virtual-key values are backend-private and were not persisted in the physical evidence.

This discovery supports only the following public-contract candidates without extrapolation:

- canonical key `a` with no modifiers;
- canonical key `enter` with no modifiers;
- canonical key `a` with exactly the `shift` modifier.

No other printable key, special key, modifier or modifier combination is physically established by this checkpoint.

## Boundaries

This checkpoint is delivery discovery, not public keyboard API validation.

A posted keyboard lifecycle does not by itself prove an arbitrary application's intended semantic action. Existing semantic text mutation and structured Computer Control operations remain preferred whenever available.

The fixture was test-owned. User content was not targeted. Numeric native key codes and typed fixture text were not persisted in the session markers.
