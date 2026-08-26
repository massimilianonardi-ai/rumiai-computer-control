# Native controls implementation roadmap

## Objective

Extend the canonical Computer Control contract from text, generic interaction
and window management to the semantic operation of native UI controls.

The implementation must support equivalent intent across macOS Accessibility,
Windows UI Automation and Linux AT-SPI without exposing OS-specific attributes
or creating a separate public API for every widget class.

Browser document automation is deliberately outside this native-controls
milestone. Cocoa/AppKit controls exposed through macOS Accessibility are the
reference physical surface for the current macOS implementation.

## Design decision

Computer Control models common control semantics, not platform widgets.
For example, a checkbox and a switch both expose a boolean state and use
`ui.toggle`; buttons, links and menu items use `ui.invoke`; sliders and steppers
share range/value operations.

The public layer therefore grows through a small set of explicit verbs:

```text
observe  -> describe, children
act      -> invoke, toggle, select, setValue
state    -> expand, collapse, increment, decrement
navigate -> scroll, scrollIntoView
text     -> observe selection/caret, select range, mutate range
```

Widget roles remain observation data used to validate whether an operation is
supported by the target.

## Invariants

Every milestone must preserve these rules:

1. Computer Use decides what to do and which semantic target is relevant.
2. Computer Control owns normalized mechanics and postcondition verification.
3. The OS backend chooses the strongest native strategy.
4. Native identifiers and accessibility objects remain backend-private.
5. Element references are observation-scoped and must be freshly resolved.
6. A backend accepting a command is not sufficient proof of semantic success.
7. Requested state is explicit whenever idempotence is possible.
8. Unsupported, unavailable, stale, ambiguous and unverified remain distinct.
9. Capability discovery reports support per backend and operation.
10. SDKs and adapters remain thin projections of the canonical contract.
11. A physical PASS is scoped to the tested OS/backend/control surface; it is
    not universal proof for every role listed by the canonical contract.
12. Browser/WebKit behavior must not drive Cocoa/AppKit-specific workarounds in
    the generic native-controls contract.

## Target control model

`ui.describe` is the foundation for all later operations. Its normalized result
contains only fields that have cross-platform meaning:

```json
{
  "target": {"ref": "@e12", "role": "checkbox", "name": "Wi-Fi"},
  "enabled": true,
  "focused": false,
  "selected": false,
  "expanded": null,
  "checked": false,
  "readOnly": false,
  "value": null,
  "range": null,
  "actions": ["toggle", "focus"],
  "childCount": 0
}
```

Fields that the backend cannot observe are `null` or absent according to the
schema; they are never guessed. Raw AX attributes, UIA pattern objects and
AT-SPI interfaces do not cross the canonical boundary.

## Current progress on `main`

Authoritative macOS Cocoa/AppKit evidence for the generic native-control core:

```text
rumiai-computer-use-PoCs
  tests/products/computer-control/results/2026-08-26-native-appkit-physical-PASS.md
  evidence commit: 2334690a069d65ebd5546508f447c39f10d3cd8f
```

Authoritative Phase 8A text-selection evidence:

```text
rumiai-computer-use-PoCs
  session: cc-phase8a-text-selection-s04
  evidence commit: faf24053aa8b9b31abc7f3ac730941921c3625f9
  result: 14 PASS / 0 FAIL / 0 BLOCKED
```

Phase 8A was physically validated against product revision:

```text
4166cab8c6b535d627c0f93fe0015ad3c69fcc6a
```

Current lifecycle state:

```text
Phase 0 contract foundation   IMPLEMENTED
Phase 1 ui.describe           PHYSICALLY_VALIDATED
Phase 2 ui.invoke             PHYSICALLY_VALIDATED
Phase 3 ui.toggle/select      PHYSICALLY_VALIDATED on AppKit reference controls
Phase 4 ui.expand/collapse    PHYSICALLY_VALIDATED on AppKit reference controls
Phase 5 value mutations       PHYSICALLY_VALIDATED on AppKit numeric controls
Phase 6 ui.children           PHYSICALLY_VALIDATED on AppKit hierarchy fixture
Phase 7 scrolling             PHYSICALLY_VALIDATED on AppKit scroll fixture
Phase 8A text observation     PHYSICALLY_VALIDATED on AppKit NSTextView
Phase 8B text range selection IMPLEMENTED; physical checkpoint pending
Phase 8C text mutation        PENDING
Phase 9 app/system surfaces   PENDING
Phase 10 low-level fallback   PENDING
```

The Phase 3-7 promotion is evidence-scoped. Remaining role coverage is tracked
below and does not invalidate the validated core semantics.

## Phase 0 — Contract foundation

Purpose: establish the shared vocabulary before adding actions.

Deliverables:

- normalized control roles and state names;
- typed value union for string, number, boolean, date, time and date-time;
- normalized range `{min, max, step, value}`;
- normalized action names;
- schemas for control description and operation results;
- canonical errors for unsupported role/action and unobservable state;
- capability naming convention for the new operations.

## Phase 1 — `ui.describe`

Purpose: make supported state and actions discoverable before attempting them.

Public API:

```js
client.describe({application, target})
```

Status: `PHYSICALLY_VALIDATED` on native macOS controls.

## Phase 2 — `ui.invoke`

Purpose: activate controls through their native primary action.

Primary roles:

- button;
- link;
- menu item;
- toolbar item;
- default dialog action.

Strategy order:

1. native invoke/press action;
2. accessibility element action;
3. observed-bounds pointer fallback.

Status: `PHYSICALLY_VALIDATED` on native macOS controls.

## Phase 3 — `ui.toggle` and `ui.select`

Purpose: support stateful boolean and selection controls idempotently.

Public APIs:

```js
client.toggle({application, target, value:true})
client.select({application, target})
```

Canonical target roles:

- checkbox and switch through `toggle`;
- radio button, tab, option, list item and row through `select`.

Required verification:

- `toggle` succeeds only when observed checked state equals the requested value;
- `select` succeeds only when the target is observed selected;
- mixed/indeterminate checkbox state is represented explicitly;
- unsupported deselection semantics fail rather than being simulated.

Validated AppKit reference coverage:

- checkbox toggle, idempotence and restore;
- radio selection and idempotence.

### Remaining Phase 3 conformance coverage

These are coverage gaps, not new API design:

- native switch semantics;
- tab selection;
- option/list-item selection;
- selectable table/list row behavior;
- mixed/indeterminate native checkbox where an AppKit fixture can expose it
  deterministically.

## Phase 4 — `ui.expand` and `ui.collapse`

Purpose: operate containers and disclosure controls without clicking arbitrary
geometry.

Canonical target roles:

- combo box;
- disclosure group;
- menu and submenu;
- tree item;
- expandable list or outline row.

Both operations are idempotent and verify final expanded state.

Validated AppKit reference coverage:

- native outline/disclosure row expand/collapse and idempotence.

### Remaining Phase 4 conformance coverage

- expandable combo box;
- menu/submenu disclosure where AX exposes a meaningful expanded state;
- additional tree-item mappings beyond the reference `NSOutlineView` fixture.

## Phase 5 — `ui.setValue`, `ui.increment` and `ui.decrement`

Purpose: cover range-based and structured-value controls.

Canonical target roles:

- slider;
- stepper/spin button;
- numeric field;
- date, time and date-time control;
- editable combo box.

Rules:

- `setValue` accepts a typed canonical value, not localized display text;
- dates use ISO values and explicit timezone semantics where relevant;
- a numeric backend may normalize to the declared step;
- success reports requested and observed normalized values;
- increment/decrement report previous and resulting values;
- progress indicators remain read-only.

Validated AppKit reference coverage:

- numeric `NSSlider` observation and setValue;
- increment/decrement over native numeric controls including stepper behavior.

### Remaining Phase 5 development and conformance coverage

The numeric core is validated, but structured values remain deliberately open:

- numeric text field semantics;
- editable combo box value semantics;
- date control canonical mapping;
- time control canonical mapping;
- date-time control canonical mapping;
- timezone rules for date-time values;
- explicit range `{min,max,step,value}` coverage where AppKit exposes metadata;
- normalization behavior when a requested numeric value is rounded to a native
  step.

Date/time work may require contract refinement, so it is classified as residual
Phase 5 development rather than only additional physical coverage.

## Phase 6 — Structure and collections

Public API:

```js
client.children({application, target, role?, depth?})
```

Purpose: expose bounded semantic structure for:

- combo box options;
- menus and submenus;
- trees and outlines;
- lists;
- tables and grids;
- tab groups.

The response preserves semantic parent/child relationships without exporting raw
Accessibility paths. Pagination and maximum-depth limits prevent unbounded trees.

Validated AppKit reference coverage:

- native AX JSON hierarchy;
- direct children;
- bounded depth;
- structural scope targets.

### Remaining Phase 6 conformance coverage

- combo-box option trees;
- native menus/submenus;
- native list collections;
- tables/grids;
- tab groups;
- table header preservation.

### Phase 6 follow-up APIs

These are intentionally not part of the current `children` contract and remain
backlog candidates:

- select multiple list items;
- identify table cells by row/column headers;
- observe selected rows/cells;
- activate a cell's native action.

They should be introduced only when a concrete Computer Use requirement needs
them; do not expand the public API for completeness alone.

## Phase 7 — Scrolling and visibility

Public APIs:

```js
client.scroll({application, target, direction, amount})
client.scrollIntoView({application, target})
```

Rules:

- prefer native Accessibility scrolling;
- distinguish container scrolling from page/application navigation;
- verify changed scroll position or target visibility;
- expose wheel/gesture delivery only as backend strategy, not semantic success.

Validated AppKit reference coverage:

- native scroll container recognition;
- semantic direction mapping;
- observable scroll postcondition;
- `scrollIntoView` native-action attempt plus bounded wheel/geometry fallback;
- deep offscreen target visibility verification.

### Remaining Phase 7 conformance coverage

- horizontal native scrolling;
- nested scroll containers;
- multiple scrollable ancestors and deterministic nearest-container choice;
- edge/idempotent behavior at top/bottom boundaries;
- additional AppKit scroll surfaces where AX exposes native scroll actions.

These are conformance hardening tasks unless evidence exposes a contract defect.

## Residual Phase 3-7 backlog policy

Residual role coverage should be executed opportunistically or before the first
release that claims those roles. It must not block Phase 8 unless a missing
behavior is foundational to the new text model.

Every residual coverage checkpoint follows the same evidence rules as new work:
individual tests, deterministic session runner, complete stdout/stderr and a
committed physical evidence set.

## Phase 8 — Advanced text controls

The generic control-state prerequisite is satisfied for the AppKit reference
surface. Phase 8 is split into three physical checkpoints so later mutation work
does not build on an unverified text-position or text-selection model.

All Phase 8 canonical offsets use one explicit unit:

```text
utf16-code-unit
```

Offsets are zero-based and `end` is exclusive. Backend-native `NSRange`,
`AXTextMarkerRange`, UIA TextRange and AT-SPI objects never cross the public
boundary.

### Phase 8A — text selection observation

Purpose: define and physically prove the canonical text-position model.

Public API:

```js
client.getTextSelection({application, target})
```

Canonical range model:

```json
{
  "start": 1,
  "end": 3,
  "length": 2,
  "collapsed": false,
  "unit": "utf16-code-unit"
}
```

Required result semantics:

- target descriptor;
- canonical selection range;
- caret position when selection is collapsed;
- selected text when observable;
- text length when observable and useful for validation;
- explicit `null`/unavailable values rather than inference.

Rules:

- `length == end - start`;
- a caret is a collapsed range where `start == end` and `length == 0`;
- a non-BMP character occupies two canonical UTF-16 units;
- native target re-resolution remains inside the pinned application process;
- target ambiguity, unavailable selection and inconsistent native observations
  fail closed.

Status: `PHYSICALLY_VALIDATED` on deterministic AppKit `NSTextView` controls.
The reference checkpoint proves a non-empty selection containing `😀` at
`[1,3)` and a collapsed caret at offset `3`.

Evidence:

```text
session: cc-phase8a-text-selection-s04
test evidence: faf24053aa8b9b31abc7f3ac730941921c3625f9
validated product: 4166cab8c6b535d627c0f93fe0015ad3c69fcc6a
result: 14 PASS / 0 FAIL / 0 BLOCKED
```

### Phase 8B — range selection

Purpose: select a native text range or place a caret without keyboard,
clipboard or coordinate delivery.

Public API:

```js
client.selectTextRange({
  application,
  target,
  range:{start:3, end:5, unit:"utf16-code-unit"}
})
```

The request contains only independent fields. `length` and `collapsed` are
derived by Computer Control.

Required behavior:

- validate `0 <= start <= end` and the explicit index unit before dispatch;
- observe full UTF-16 text length when available and reject out-of-bounds ranges
  before mutation;
- return idempotently when the exact range is already selected;
- set selection through the strongest native Accessibility primitive;
- on macOS, require `AXSelectedTextRange` to be settable and write a real
  `CFRange` with `AXUIElementSetAttributeValue`;
- verify the exact native range immediately after the write;
- independently re-observe the selection through the Phase 8A observation path;
- succeed only when the independent observed canonical range equals the request;
- preserve collapsed selection as explicit caret placement;
- never loosen target matching after permission, ambiguity, mutation or
  verification failures.

Status: `IMPLEMENTED`; deterministic Cocoa/AppKit physical checkpoint pending.

The physical checkpoint must prove:

1. non-empty range selection;
2. exact selected text after the write;
3. idempotent re-selection;
4. collapsed range/caret placement;
5. UTF-16 consistency around the existing non-BMP fixture;
6. out-of-bounds rejection without changing the current range.

### Phase 8C — range mutation and insertion

Candidate public APIs:

```js
client.replaceTextRange({application, target, range, text})
client.insertText({application, target, text})
client.appendText({application, target, text})
```

Required behavior:

- replace only the requested range;
- insert at the observed caret without replacing unrelated text;
- append at the canonical text end;
- preserve literal payload exactly;
- verify resulting text/range state;
- fail closed if precise mutation cannot be proved.

Clipboard-assisted or keyboard-assisted delivery may be backend strategies, but
must not change canonical semantics or weaken verification.

Phase 8C must not start from an assumption that 8B works physically; its
implementation checkpoint begins only after committed Phase 8B physical PASS.

## Phase 9 — Application and system surfaces

Candidate APIs:

- `application.list`;
- `application.launch`;
- `application.activate`;
- `application.terminate`;
- modal dialog and alert observation;
- file picker navigation and selection;
- menu bar, Dock/taskbar and system tray/menu extras;
- display and multi-monitor observation;
- richer clipboard formats.

These operations require separate security and consent review because they can
change system-wide state.

Recommended internal subdivision:

```text
9A application lifecycle
9B dialogs and file pickers
9C system chrome / menu extras / Dock/taskbar
9D displays and richer clipboard
```

## Phase 10 — Explicit low-level fallbacks

Candidate APIs:

- pointer move and button delivery;
- drag and drop;
- wheel/gesture delivery;
- screenshot of display, window or element;
- OCR/vision adapter input.

These are fallback capabilities. They do not replace a working semantic
operation, and coordinates generated directly by an LLM are not accepted as
verified target identity.

Low-level action delivery and semantic success remain separate concepts.

## Browser surface — deliberately deferred

Browser document automation remains outside this roadmap's native-control
implementation phases.

If/when browser control is introduced, it should be designed as a separate
surface/backend (for example browser automation/CDP where appropriate) rather
than treating HTML/ARIA controls exposed through Safari/WebKit as Cocoa/AppKit
controls.

Browser UI chrome that is genuinely exposed as native macOS controls may be
considered separately from webpage content, but must be validated and labeled by
its actual surface.

## Repository workflow

Changes are split across the existing repositories:

```text
rumiai-computer-control
  canonical schemas, runtime routing, backend, SDK, adapter and API docs

rumiai-computer-use-PoCs
  boundary checks, physical harnesses, exact evidence and experimental work

rumiai-computer-use
  consumer integration only after a Computer Control capability is released

rumiai-portable-runtime
  portable installation/start support only when dependencies change
```

Computer Control and Computer Use remain free of experimental source,
validation harnesses and result archives.

The canonical operational development/physical-validation workflow is maintained
in the laboratory repository at:

```text
docs/workflows/computer-control-development-validation-workflow.md
```

## Per-operation implementation cycle

Each operation is delivered independently or in a semantically coherent
checkpoint:

1. define semantic question and observable postcondition;
2. add/refine language-neutral schema;
3. add router validation and canonical error mapping;
4. add macOS implementation using the strongest Accessibility primitive;
5. expose SDK and RumiAI adapter methods when applicable;
6. update `runtime.info` capability discovery;
7. update API reference;
8. commit product changes;
9. add matching contract/boundary/physical micro-tests in the PoC repository;
10. create an immutable physical session runner;
11. execute the runner on the target Mac and commit exact evidence;
12. diagnose evidence in the development chat;
13. fix product/test code and create a new session if necessary;
14. promote only physically proven capability metadata in a distinct reviewed
    product commit.

Windows and Linux implementations follow the same contract when there is a
concrete target environment. They do not delay macOS progress, but macOS-only
details cannot become canonical semantics.
