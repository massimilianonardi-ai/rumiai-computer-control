# Native controls implementation roadmap

## Objective

Extend the canonical Computer Control contract from text, generic interaction
and window management to the semantic operation of native UI controls.

The implementation must support equivalent intent across macOS Accessibility,
Windows UI Automation and Linux AT-SPI without exposing OS-specific attributes
or creating a separate public API for every widget class.

## Design decision

Computer Control will model common control semantics, not platform widgets.
For example, a checkbox and a switch both expose a boolean state and use
`ui.toggle`; buttons, links and menu items use `ui.invoke`; sliders and steppers
share range/value operations.

The public layer should therefore grow through a small set of explicit verbs:

```text
observe  -> describe, children
act      -> invoke, toggle, select, setValue
state    -> expand, collapse, increment, decrement
navigate -> scroll, scrollIntoView
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

## Target control model

`ui.describe` is the foundation for all later operations. Its normalized result
should contain only fields that have cross-platform meaning:

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

Fields that the backend cannot observe should be `null` or absent according to
the final schema; they must never be guessed. Raw AX attributes, UIA pattern
objects and AT-SPI interfaces must not cross the canonical boundary.

## Delivery sequence

Current progress on `main`:

```text
Phase 0 contract foundation  IMPLEMENTED
Phase 1 ui.describe          PHYSICALLY_VALIDATED
Phase 2 ui.invoke            PENDING
Phase 3 ui.toggle/select     PENDING
```

### Phase 0 — Contract foundation

Purpose: establish the shared vocabulary before adding actions.

Deliverables:

- normalized control roles and state names;
- typed value union for string, number, boolean, date, time and date-time;
- normalized range `{min, max, step, value}`;
- normalized action names;
- schemas for control description and operation results;
- canonical errors for unsupported role/action and unobservable state;
- capability naming convention for the new operations.

Exit criteria:

- the contract can describe button, checkbox, radio button, switch, combo box,
  list item, slider, stepper, date control, tab, menu item, tree item, table cell,
  scroll area and progress indicator without OS-specific fields.

### Phase 1 — `ui.describe`

Purpose: make supported state and actions discoverable before attempting them.

Public API:

```js
client.describe({application, target})
```

Expected observations:

- normalized role/subrole and accessible name;
- current value and value type;
- enabled, focused, selected, checked, expanded and read-only state;
- range metadata when available;
- supported semantic actions;
- child count and parent role when observable.

Exit criteria:

- macOS results are derived from Accessibility state, never from role-based
  assumptions;
- unsupported or unavailable observations are explicit;
- the capability appears in `runtime.info`, the SDK and the API reference.

### Phase 2 — `ui.invoke`

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

`INVOKED` proves action delivery. When the resulting application state is not
intrinsic to the control, Computer Use must observe the intended consequence.

### Phase 3 — `ui.toggle` and `ui.select`

Purpose: support stateful boolean and selection controls idempotently.

Public APIs:

```js
client.toggle({application, target, value:true})
client.select({application, target})
```

Target roles:

- checkbox and switch through `toggle`;
- radio button, tab, option, list item and row through `select`.

Required verification:

- `toggle` succeeds only when the observed checked state equals the requested
  boolean value;
- `select` succeeds only when the target is observed selected;
- mixed/indeterminate checkbox state is represented explicitly;
- unsupported deselection semantics fail rather than being simulated.

### Phase 4 — `ui.expand` and `ui.collapse`

Purpose: operate containers and disclosure controls without clicking arbitrary
geometry.

Target roles:

- combo box;
- disclosure group;
- menu and submenu;
- tree item;
- expandable list or outline row.

Both operations must be idempotent and verify the final expanded state. A combo
box option is selected with `ui.select`, not encoded inside `ui.expand`.

### Phase 5 — `ui.setValue`, `ui.increment` and `ui.decrement`

Purpose: cover range-based and structured-value controls.

Target roles:

- slider;
- stepper/spin button;
- numeric field;
- date, time and date-time control;
- editable combo box.

Rules:

- `setValue` accepts a typed canonical value, not localized display text;
- dates use ISO values and explicit timezone semantics where relevant;
- a numeric backend may normalize to the declared step;
- success reports both requested and observed normalized values;
- increment/decrement report the previous and resulting value;
- progress indicators remain read-only and are observed through `ui.describe`.

### Phase 6 — Structure and collections

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

The response should preserve semantic parent/child relationships and table
headers without exporting raw accessibility paths. Pagination and maximum-depth
limits are required to prevent unbounded trees.

Potential follow-up operations:

- select multiple list items;
- identify table cells by row/column headers;
- observe selected rows/cells;
- activate a cell's native action.

### Phase 7 — Scrolling and visibility

Public APIs:

```js
client.scroll({application, target, direction, amount})
client.scrollIntoView({application, target})
```

Rules:

- prefer native accessibility scrolling;
- distinguish container scrolling from page/application navigation;
- verify changed scroll position or target visibility;
- expose wheel/gesture delivery only as a backend strategy, not semantic
  success by itself.

### Phase 8 — Advanced text controls

Add only after the generic control state model is stable:

- observe selection and caret;
- select a text range;
- replace a range;
- insert or append without replacing all text;
- observe selected text;
- preserve literal payload exactly.

Text positions need a canonical range model and must not expose backend-native
objects.

### Phase 9 — Application and system surfaces

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

### Phase 10 — Explicit low-level fallbacks

Candidate APIs:

- pointer move and button delivery;
- drag and drop;
- wheel/gesture delivery;
- screenshot of display, window or element;
- OCR/vision adapter input.

These are fallback capabilities. They must not replace a working semantic
operation, and coordinates generated directly by an LLM are not accepted as
verified target identity.

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

Computer Control and Computer Use must remain free of experimental source,
validation harnesses and result archives.

## Per-operation implementation cycle

Each operation is delivered independently:

1. define the semantic question and observable postcondition;
2. add or refine the language-neutral schema;
3. add router validation and canonical error mapping;
4. add the macOS implementation using the strongest Accessibility primitive;
5. expose the method in the TypeScript SDK and RumiAI adapter when applicable;
6. update `runtime.info` capability discovery;
7. update the API reference;
8. validate boundary behavior from the PoC repository;
9. validate physically on macOS and record the exact result in the PoC;
10. release the capability before Computer Use depends on it.

Windows and Linux implementations follow the same contract when there is a
concrete target environment. They must not delay macOS progress, but macOS-only
details cannot become canonical semantics.

## Completion criteria for every operation

An operation is complete only when:

- request and result schemas are unambiguous;
- invalid and unsupported states fail closed;
- the backend re-resolves fresh ephemeral handles before acting;
- the documented verification is actually observed;
- `runtime.info` reports its real support and validation state;
- SDK types match runtime behavior;
- API documentation includes parameters, behavior and result semantics;
- the external validation repository contains the relevant evidence;
- no test or experimental artifact is added to a product repository;
- portable execution introduces no system-wide or user-profile installation.

## Recommended first release

The next functional release should target `0.9.0` and contain only:

1. Phase 0 contract foundation;
2. `ui.describe`;
3. `ui.invoke`;
4. `ui.toggle`;
5. `ui.select`.

This slice covers the most common button, link, checkbox, switch, radio, tab,
option and list-item semantics while establishing the model needed by all later
controls. `setValue`, structured dates, collections and scrolling should remain
outside `0.9.0` unless the first slice is already physically validated and
released.
