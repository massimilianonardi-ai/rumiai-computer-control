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
Phase 0  contract foundation               IMPLEMENTED
Phase 1  ui.describe                       PHYSICALLY_VALIDATED
Phase 2  ui.invoke                         PHYSICALLY_VALIDATED
Phase 3  ui.toggle/select                  PHYSICALLY_VALIDATED on AppKit reference controls
Phase 4  ui.expand/collapse                PHYSICALLY_VALIDATED on AppKit reference controls
Phase 5  value mutations                   PHYSICALLY_VALIDATED on AppKit numeric controls
Phase 6  ui.children                       PHYSICALLY_VALIDATED on AppKit hierarchy fixture
Phase 7  scrolling                         PHYSICALLY_VALIDATED on AppKit scroll fixture
Phase 8A text observation                  PHYSICALLY_VALIDATED on AppKit NSTextView
Phase 8B text range selection              PHYSICALLY_VALIDATED on AppKit NSTextView
Phase 8C text mutation                     PHYSICALLY_VALIDATED on AppKit NSTextView
Phase 9A1 application list/launch/activate PHYSICALLY_VALIDATED on AppKit lifecycle fixture
Phase 9A2 application terminate            IMPLEMENTED; physical checkpoint pending
Phase 9B dialogs/file pickers              PENDING
Phase 9C system chrome                     PENDING
Phase 9D displays/richer clipboard         PENDING
Phase 10 low-level fallbacks               PENDING
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

Application lifecycle checkpoint:

```text
9A1 session: cc-phase9a1-application-lifecycle-s01
    evidence: 8f75ba73c1443842b8b8f29e9cd9fd67cddb4b79
    validated product: 5e36c5fd098ac50f80e439f1bb4e778e73c3fd86
    result: 18 PASS / 0 FAIL / 0 BLOCKED
```

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

Phase 9 changes or observes system-wide state and therefore requires explicit security boundaries per sub-phase.

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

Evidence proves:

1. fixture Provider appears in `application.list` before launch as available and not running;
2. `application.activate` before launch fails `APP_NOT_RUNNING` and does not launch;
3. `application.launch` starts the exact fixture bundle and reports running;
4. repeated launch is idempotent;
5. activation brings the fixture to foreground;
6. repeated activation is idempotent;
7. `application.list` reflects running/active state transitions.

### Phase 9A2 — graceful application termination

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

Status: `IMPLEMENTED`; deterministic physical checkpoint pending.

Required physical evidence:

1. terminating an already-stopped fixture is idempotent and does not launch it;
2. a launched fixture can be terminated gracefully by exact Provider identity;
3. result state is `APPLICATION_TERMINATED` only after the process is independently observed absent;
4. final `application.list` reports `running:false` and `active:false`;
5. repeated termination remains idempotent;
6. the test proves the product contains no force-kill fallback.

### Phase 9B — dialogs and file pickers

- modal dialog/alert observation;
- default/cancel semantic actions;
- file picker navigation and selection;
- explicit handling of destructive/security-sensitive dialogs.

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
