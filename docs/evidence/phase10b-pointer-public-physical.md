# Phase 10B — public pointer move/click physical validation

## Authoritative checkpoint

```text
session: cc-phase10b-pointer-public-s03
evidence: a7b878ff25e56ee7c16705dfdec1468f6a47b0a1
validated product: 3f68502848f127d73f72cac023deed511f3ce75d
test source: a3cd3f6b143d4c2e74d1d831218778ea19a3e48b
poc SHA tested: 1271dd80d331d97005e8e99c00b98af116f66225
result: 43 PASS / 0 FAIL / 0 BLOCKED
platform: macOS 26.5.2 (25F84), arm64
node: v26.7.0
swift: 6.3.3
```

Historical public sessions remain immutable:

```text
s01 evidence: 7a21ce6e84046b31700d36bda9adc794ef41ea92 — FAIL
s02 evidence: 3d8176d5ce1e198af1d4922dc6e3fe85670b3dcf — FAIL
s03 evidence: a7b878ff25e56ee7c16705dfdec1468f6a47b0a1 — PASS
```

The s01 product correction removed an invalid post-click cursor-position gate while retaining independent pointer-position verification immediately before button posting. The s02 physical test already passed completely; its global failure was a stale documentation guard. The s03 checkpoint reran the unchanged public physical harness against the same corrected product SHA with the guard fixed.

## Physical observations

The public runtime and SDK were exercised against a temporary test-owned AppKit fixture.

Observed PASS markers:

```text
phase10b-public-move-capability-implemented=PASS
phase10b-public-click-capability-implemented=PASS
phase10b-public-capability-strategies=PASS
phase10b-primary-display-observed=PASS primaryCount=1
phase10b-public-fixture-ready=PASS
phase10b-public-target-within-primary=PASS
phase10b-public-move-state=PASS
phase10b-public-move-position=PASS
phase10b-public-move-verification=PASS
phase10b-public-left-click-state=PASS
phase10b-public-left-click-boundary=PASS
phase10b-public-right-click-state=PASS
phase10b-public-right-click-boundary=PASS
phase10b-independent-left-delivery=PASS down=1 up=1
phase10b-independent-right-delivery=PASS down=1 up=1
phase10b-public-pointer-restored=PASS
phase10b-public-test-owned-fixture=PASS
phase10b-public-user-content-clicked=PASS value=false
phase10b-public-coordinate-logging=PASS coordinatesLogged=false nativeDisplayIdsLogged=false
physical-phase10b-pointer-public=PASS
```

## What this validates

`pointer.move` is physically validated on the current macOS reference surface as a primary-display-local fallback whose requested position is independently re-observed through Quartz before success is returned.

`pointer.click` is physically validated on the same surface as a complete left/right down-up post after position verification. An independent AppKit fixture observed exactly one down and one up event for each tested button.

The public click result intentionally remains delivery-bounded:

```text
state = CLICK_POSTED
positionVerified = true
buttonDelivery = POSTED
semanticConsequenceVerified = false
```

Physical validation therefore does not convert raw click delivery into semantic application success.

## Safety and privacy boundary

- the target window was owned by the test fixture;
- no user content was clicked;
- the original pointer position was restored before fixture exit;
- the previous frontmost application was reactivated by the fixture cleanup path;
- fixture coordinates were not persisted in evidence;
- native display identifiers were not persisted in evidence;
- no public held-button API was introduced.

## Scope limit

This checkpoint validates the current primary-display macOS reference topology only. It does not establish multi-display coordinate conformance, arbitrary application semantic reaction, drag/drop, wheel delivery, keyboard fallback, OCR, or vision targeting.
