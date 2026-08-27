# Native controls implementation roadmap

## Scope

Computer Control models semantic native UI operations across platform backends. macOS Cocoa/AppKit exposed through Accessibility is the current physical reference surface. Browser document automation remains a separate future backend/surface and must not drive native-control workarounds.

## Invariants

1. Computer Use decides intent and semantic target; Computer Control owns mechanics and postconditions.
2. OS-specific Accessibility objects and native handles remain backend-private.
3. Element references are observation-scoped and must be freshly resolved after relevant state changes.
4. Delivery is not success: every mutating semantic operation requires an observed postcondition.
5. Unsupported, unavailable, stale, ambiguous and unverified are distinct failures.
6. SDKs/adapters are thin projections of the canonical contract.
7. Physical validation is scoped to the tested backend/control surface, not every canonical role.
8. Browser/WebKit document behavior is out of scope for this native-controls roadmap.

## Current lifecycle state

```text
Phase 0   contract foundation                  IMPLEMENTED
Phase 1   ui.describe                          PHYSICALLY_VALIDATED
Phase 2   ui.invoke                            PHYSICALLY_VALIDATED
Phase 3   ui.toggle/select                     PHYSICALLY_VALIDATED on AppKit reference controls
Phase 4   ui.expand/collapse                   PHYSICALLY_VALIDATED on AppKit reference controls
Phase 5   value mutations                      PHYSICALLY_VALIDATED on AppKit numeric controls
Phase 6   ui.children                          PHYSICALLY_VALIDATED on AppKit hierarchy fixture
Phase 7   scrolling                            PHYSICALLY_VALIDATED on AppKit scroll fixture
Phase 8A  text observation                     PHYSICALLY_VALIDATED on AppKit NSTextView
Phase 8B  text range selection                 PHYSICALLY_VALIDATED on AppKit NSTextView
Phase 8C  text mutation                        PHYSICALLY_VALIDATED on AppKit NSTextView
Phase 9A1 application list/launch/activate     PHYSICALLY_VALIDATED on AppKit lifecycle fixture
Phase 9A2 application terminate                PHYSICALLY_VALIDATED on AppKit lifecycle fixture
Phase 9B1 dialog/alert observation             PHYSICALLY_VALIDATED on AppKit NSAlert sheet fixture
Phase 9B2 dialog semantic default/cancel       IMPLEMENTED; physical checkpoint pending
Phase 9B3 file picker navigation/selection     PENDING
Phase 9C  system chrome                        PENDING
Phase 9D  displays/richer clipboard            PENDING
Phase 10  low-level fallbacks                  PENDING
```

## Physical evidence

Generic native-control core, Phase 3-7:

```text
rumiai-computer-use-PoCs
tests/products/computer-control/results/2026-08-26-native-appkit-physical-PASS.md
```

Advanced text checkpoints:

```text
8A session: cc-phase8a-text-selection-s04
   evidence: faf24053aa8b9b31abc7f3ac730941921c3625f9
   result: 14 PASS / 0 FAIL / 0 BLOCKED

8B session: cc-phase8b-text-range-selection-s01
   evidence: c1cbab943cd2885ee9f62098cc23f1b903dc4dee
   result: 15 PASS / 0 FAIL / 0 BLOCKED

8C session: cc-phase8c-text-mutation-s03
   evidence: 451ea2f7b70dc740216792a1634abe337992b23b
   validated product: d679a89a88977a70c450eec9e1aece6c7b2a6506
   result: 17 PASS / 0 FAIL / 0 BLOCKED
```

Application lifecycle checkpoints:

```text
9A1 session: cc-phase9a1-application-lifecycle-s01
    evidence: 8f75ba73c1443842b8b8f29e9cd9fd67cddb4b79
    validated product: 5e36c5fd098ac50f80e439f1bb4e778e73c3fd86
    result: 18 PASS / 0 FAIL / 0 BLOCKED

9A2 session: cc-phase9a2-application-terminate-s01
    evidence: e58549c9492a300581e8e6fd13f859bebfb7c3f3
    validated product: 2c99a708a5c78262a0df1c2d9bbbdc18cf72932a
    result: 19 PASS / 0 FAIL / 0 BLOCKED
```

Dialog checkpoints:

```text
9B1 session: cc-phase9b1-dialog-observation-s02
    evidence: 33a5af37e98e93e7321050f23002072ecad2290d
    validated product: 2e7aaa24572fe5d55262d8cdce7f8fbc06cfaa58
    result: 20 PASS / 0 FAIL / 0 BLOCKED
```

Historical FAIL evidence remains preserved, including `cc-phase9b1-dialog-observation-s01`; later PASS evidence does not rewrite earlier sessions.

## Phase 3-7 residual backlog

The validated core semantics stay validated; these items are additional conformance/development coverage and do not reopen the existing APIs.

### Phase 3 — toggle/select coverage

- native switch semantics;
- tab selection;
- option/list-item selection;
- selectable table/list rows;
- deterministic mixed/indeterminate checkbox coverage.

### Phase 4 — expand/collapse coverage

- expandable combo box;
- menu/submenu expanded state where Accessibility exposes meaningful semantics;
- additional tree-item mappings beyond the reference `NSOutlineView` fixture.

### Phase 5 — value coverage/development

- numeric text fields;
- editable combo boxes;
- date, time and date-time canonical mapping;
- timezone rules for date-time;
- explicit `{min,max,step,value}` metadata;
- native step-normalization behavior.

Structured date/time work may require contract refinement and therefore remains residual development, not only physical coverage.

### Phase 6 — collections

- combo-box option trees;
- menus/submenus;
- native lists;
- tables/grids and header preservation;
- tab groups.

Backlog candidate APIs, introduced only for concrete Computer Use needs:

- multi-selection;
- table cell addressing by row/column headers;
- selected row/cell observation;
- native cell action.

### Phase 7 — scrolling

- horizontal scrolling;
- nested scroll containers;
- deterministic nearest-container choice with multiple ancestors;
- top/bottom idempotent boundary behavior;
- additional AppKit scroll surfaces.

Residual Phase 3-7 work is opportunistic or release-hardening work unless evidence exposes a contract defect.

## Phase 8 — advanced text controls — COMPLETE on AppKit reference surface

Canonical offsets are zero-based UTF-16 code units with exclusive `end`. `NSRange`, AX text marker objects, UIA TextRange and AT-SPI objects never cross the public boundary.

Validated APIs:

```text
ui.getTextSelection
ui.selectTextRange
ui.replaceTextRange
ui.insertText
ui.appendText
```

The physical evidence proves non-BMP/emoji indexing, selected text, caret observation and placement, exact range selection, idempotence, out-of-bounds rejection, exact native range mutation, insertion, append, deletion, surrogate-pair boundary rejection and independent fresh AX postconditions.

## Phase 9 — application and system surfaces

Phase 9 changes or observes system-wide state and therefore uses explicit security boundaries per sub-phase.

### Phase 9A1 — provider-scoped application inventory, launch and activation — COMPLETE on AppKit reference surface

Public APIs:

```js
client.listApplications({availableOnly:false})
client.launchApplication({application})
client.activateApplication({application})
```

Contract decisions:

- `application.list` lists registered application Providers that Computer Control can address; it is not a generic process list;
- no arbitrary executable path or shell command is accepted from callers;
- `application.launch` resolves the exact Provider application and verifies it becomes observed as running;
- launch is idempotent for an already-running Provider and does not intentionally create a second instance;
- `application.activate` requires an already-running application and never launches implicitly;
- activation success requires the Provider identity to match the observed foreground application;
- public descriptors contain semantic/provider identity only; process IDs are not durable application identity.

Status: `PHYSICALLY_VALIDATED` on the deterministic macOS Cocoa/AppKit lifecycle fixture.

### Phase 9A2 — graceful application termination — COMPLETE on AppKit reference surface

Public API:

```js
client.terminateApplication({application})
```

Contract decisions:

- only registered application Providers are addressable;
- already-stopped applications succeed idempotently;
- the macOS backend identifies the application through its resolved bundle identity and requests graceful termination with `NSRunningApplication.terminate()`;
- no PID or arbitrary executable path is accepted through the public contract;
- no force-termination primitive is part of the capability;
- Computer Control never answers save/discard/cancel or other application dialogs as part of termination;
- semantic success requires an independent postcondition that the Provider application is no longer observed running;
- a rejected request, ambiguous native identity or application that remains running fails explicitly rather than being reported as terminated.

Status: `PHYSICALLY_VALIDATED` on the deterministic macOS Cocoa/AppKit lifecycle fixture.

### Phase 9B1 — native dialog and alert observation — COMPLETE on AppKit reference surface

Public API:

```js
client.listDialogs({application})
```

Contract decisions:

- application-scoped through an existing registered Provider;
- read-only observation only;
- no implicit launch or activation;
- canonical `dialog` / `sheet` kinds rather than raw platform Accessibility objects;
- observable title, visible static text, modal state and button label/enabled state where exposed;
- unavailable state is represented explicitly rather than guessed;
- native identifiers, PIDs and AX objects do not become durable public identity;
- no button is invoked and no dialog is dismissed as part of observation;
- default/cancel and destructive semantics are not inferred from labels.

Status: `PHYSICALLY_VALIDATED` on the deterministic Cocoa/AppKit `NSAlert` sheet fixture.

Evidence proves an empty observed state, native sheet discovery, exact alert text, button labels/enabled state, explicit preservation of unavailable `AXModal` as `null`, and repeated observation without dismissing or mutating the sheet.

### Phase 9B2 — dialog semantic actions

Public APIs:

```js
client.invokeDialogDefault({application, timeoutMs})
client.invokeDialogCancel({application, timeoutMs})
```

Contract decisions:

- application-scoped through an existing registered Provider;
- no implicit launch or activation;
- exactly one running Provider process and exactly one native dialog/sheet are required at action time;
- `default` resolves only through native `AXDefaultButton`;
- `cancel` resolves only through native `AXCancelButton`;
- no label, coordinate, public native handle or heuristic text matching selects the action target;
- disabled or unavailable semantic actions fail explicitly;
- delivery is not success: after native `AXPress`, the dialog must become absent under independent Accessibility observation;
- application exit is not silently treated as ordinary dialog-action success;
- destructive/security-sensitive authorization is not inferred from labels and remains a higher-layer policy decision.

Status: `IMPLEMENTED`; deterministic Cocoa/AppKit physical checkpoint pending.

Required physical evidence:

1. no-dialog invocation fails closed;
2. a real `NSAlert` exposes and executes its native default action;
3. the sheet is absent after default action success;
4. a reopened `NSAlert` exposes and executes its native cancel action;
5. the sheet is absent after cancel action success;
6. both actions report verified semantic postconditions without label-based targeting.

### Phase 9B3 — file picker navigation and selection

After dialog observation/action semantics stabilize:

- native file-picker observation;
- directory navigation;
- file/directory selection;
- explicit accept/cancel semantics;
- no arbitrary filesystem mutation implied by picker navigation.

### Phase 9C — system chrome

- menu bar;
- Dock/taskbar;
- system tray/menu extras.

### Phase 9D — displays and richer clipboard

- display and multi-monitor observation;
- richer clipboard formats with explicit type metadata.

## Phase 10 — explicit low-level fallbacks

Candidate capabilities:

- pointer move and button delivery;
- drag and drop;
- wheel/gesture delivery;
- screenshot of display/window/element;
- OCR/vision adapter input.

These are fallbacks. A working semantic operation always takes precedence, and coordinate delivery is not itself semantic success.

## Browser surface — deferred

Browser document automation should be implemented as a separate surface/backend, for example browser automation/CDP where appropriate. Browser chrome that is genuinely a native OS surface may be treated separately, but webpage HTML/ARIA is not Cocoa/AppKit validation.

## Repository workflow

```text
rumiai-computer-control
  canonical schemas, runtime, backends, SDK, adapters, API docs

rumiai-computer-use-PoCs
  contract/boundary tests, physical fixtures, session runners, committed evidence

rumiai-computer-use
  consumer integration after Computer Control capability release
```

Canonical execution workflow:

```text
docs/workflows/computer-control-development-validation-workflow.md
```

Every checkpoint follows:

```text
implement product -> commit
individual tests -> commit
boundary CI -> PASS
immutable session runner -> commit
physical Mac execution
unified log + JSON -> evidence commit/push
chat diagnosis
fix/retest if needed
separate physical-validation promotion commit
```

The previous long-form roadmap is retained in the repository as historical reference rather than deleted.
