# Phase 10C drag delivery discovery — physical evidence

## Authoritative checkpoint

```text
session: cc-phase10c-drag-delivery-discovery-s01
evidence: 47ee8e31a08597cffc0c773dfaf72a093501e5c4
observed product: 37069dcf683c168c3b9727e5b4464ff457b1222c
test source: 6c13b1e8868ec5667cc9a6e4611d4f69799dda67
poc SHA tested: a6b9c4d4afd321b99276c442a72f61a73d8baae9
result: PASS
```

The checkpoint ran on the physical macOS reference machine after public Phase 10B pointer move/click validation.

## Observed drag lifecycle

The test-owned AppKit fixture independently observed one complete left-button drag lifecycle:

```text
left mouse down     1
left mouse dragged  4
left mouse up       1
```

The fixture also owned a hit-test-transparent marker whose position was updated only from AppKit `mouseDragged`/`mouseUp` delivery. The marker reached the independent destination zone, so the checkpoint established more than Quartz event construction or posting.

Physical log markers:

```text
phase10c-drag-left-down-delivery=PASS count=1
phase10c-dragged-delivery=PASS count=4
phase10c-drag-left-up-delivery=PASS count=1
phase10c-drag-fixture-consequence=PASS markerDestinationObserved=true
phase10c-drag-pointer-restored=PASS
phase10c-drag-release-clean=PASS emergencyReleasePosted=false
phase10c-drag-test-owned-fixture=PASS
phase10c-drag-coordinate-logging=PASS coordinatesLogged=false nativeDisplayIdsLogged=false
physical-phase10c-drag-delivery-discovery=PASS
```

## Safety boundary

The discovery owned the complete `leftMouseDown -> leftMouseDragged* -> leftMouseUp` lifecycle inside one process. If failure occurred while the button might still be down, cleanup was designed to post an emergency left-button release before restoring pointer/focus.

On the authoritative PASS path:

```text
emergencyReleasePosted=false
```

The original pointer position was restored and the previously frontmost application was reactivated. The fixture was test-owned and no user content was targeted.

No source/destination coordinates or native display identifiers were persisted in the evidence.

## What this proves

This checkpoint proves on the tested macOS reference surface that Quartz can deliver a complete left-button drag sequence to a controlled AppKit fixture and that an independently observable fixture consequence can result from that delivery.

It does **not** prove that an arbitrary future application's intended drag/drop semantic consequence succeeded. A low-level public drag fallback must continue to report event delivery separately from semantic success.

## Public-contract consequence

The evidence is sufficient to implement a narrow atomic `pointer.drag` fallback with:

- current primary display only;
- explicit source and destination logical coordinates;
- left button only;
- source position independently observed before button-down;
- down/drag/up owned by one call;
- release cleanup internal to the operation;
- no public `pointer.down` or `pointer.up` state across RPC calls;
- delivery reported as `POSTED`;
- `semanticConsequenceVerified:false`.

A dedicated runtime/SDK physical checkpoint is still required before `pointer.drag` can be promoted from `IMPLEMENTED` to `PHYSICALLY_VALIDATED`.
