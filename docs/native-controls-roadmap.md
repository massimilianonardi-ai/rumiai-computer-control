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
Phase 0    contract foundation                  IMPLEMENTED
Phase 1    ui.describe                          PHYSICALLY_VALIDATED
Phase 2    ui.invoke                            PHYSICALLY_VALIDATED
Phase 3    ui.toggle/select                     PHYSICALLY_VALIDATED on AppKit reference controls
Phase 4    ui.expand/collapse                   PHYSICALLY_VALIDATED on AppKit reference controls
Phase 5    value mutations                      PHYSICALLY_VALIDATED on AppKit numeric controls
Phase 6    ui.children                          PHYSICALLY_VALIDATED on AppKit hierarchy fixture
Phase 7    scrolling                            PHYSICALLY_VALIDATED on AppKit scroll fixture
Phase 8A   text observation                     PHYSICALLY_VALIDATED on AppKit NSTextView
Phase 8B   text range selection                 PHYSICALLY_VALIDATED on AppKit NSTextView
Phase 8C   text mutation                        PHYSICALLY_VALIDATED on AppKit NSTextView
Phase 9A1  application list/launch/activate     PHYSICALLY_VALIDATED on AppKit lifecycle fixture
Phase 9A2  application terminate                PHYSICALLY_VALIDATED on AppKit lifecycle fixture
Phase 9B1  dialog/alert observation             PHYSICALLY_VALIDATED on AppKit NSAlert sheet fixture
Phase 9B2  dialog semantic default/cancel       PHYSICALLY_VALIDATED on AppKit NSAlert sheet fixture
Phase 9B3A file picker observation              PHYSICALLY_VALIDATED on AppKit NSOpenPanel fixture
Phase 9B3B file picker selection/expansion      PHYSICALLY_VALIDATED on AppKit NSOpenPanel fixture
Phase 9B3C file picker accept/cancel            PHYSICALLY_VALIDATED on AppKit NSOpenPanel fixture
Phase 9C1A application menu bar observation     PHYSICALLY_VALIDATED on macOS AppKit/AX surface
Phase 9C2A Dock observation                     PHYSICALLY_VALIDATED on macOS Dock AX surface
Phase 9C3A menu extras observation              PHYSICALLY_VALIDATED on macOS menu-extras AX surface
Phase 9D1A display observation                  PHYSICALLY_VALIDATED on current macOS reference topology
Phase 9D2A clipboard metadata observation       IMPLEMENTED
Phase 9D2B typed clipboard read                 PENDING
Phase 9D2C typed clipboard write                PENDING
Phase 10   low-level fallbacks                  PENDING
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

9B2 session: cc-phase9b2-dialog-semantic-actions-s01
    evidence: 05ddc49834da2a5c6734ecd9904e3bb7051bbc37
    validated product: 86421b35f6413c990cebcb76f4357412266d06f7
    result: 21 PASS / 0 FAIL / 0 BLOCKED
```

File-picker checkpoints:

```text
9B3A discovery session: cc-phase9b3a-file-picker-discovery-s02
    evidence: 326f3283da91ee4c32a7d67bd8bb6e55b414d9ce
    result: 22 PASS / 0 FAIL / 0 BLOCKED

9B3A observation session: cc-phase9b3a-file-picker-observation-s01
    evidence: 63a2b850a2c1dcf8509a27e7f8292a1f09f811ba
    validated product: c26552046ae0cc18b76ab33d6a24af98b0e68cde
    result: 23 PASS / 0 FAIL / 0 BLOCKED

9B3B directory-action discovery: cc-phase9b3b-directory-actions-discovery-s01
    evidence: cedecaecd29846c7dacef4b24e5fe1d226b4ef5b
    result: 25 PASS / 0 FAIL / 0 BLOCKED

9B3B disclosure discovery: cc-phase9b3b-directory-disclosure-discovery-s01
    evidence: 48ead70cf79cf05827cc5dcde9e7d7fda31363b3
    validated discovery product: 16e4f1b427170b0e5c729a10629990d48ee71daf
    result: 26 PASS / 0 FAIL / 0 BLOCKED

9B3B public validation: cc-phase9b3b-file-picker-selection-expansion-s01
    evidence: 36ca5eb400954457f44467d9028e6f26a21e70cd
    validated product: 805ec5126f991bd6a19945bfda5d0fc2778ae221
    test source: 5e9fb88809af10c07bcf9f109d8d1e51ff92994a
    poc SHA tested: 8db375a5b23103f834d04721639400c6d61cbdc5
    result: 26 PASS / 0 FAIL / 0 BLOCKED

9B3C public validation: cc-phase9b3c-file-picker-semantic-actions-s03
    evidence: 9a47234951d3de5dff9d4b975892a8b0b07e079d
    validated product: 2be349b1fdf2a6ea08ee893be423942d926a2c0b
    test source: 2f107d05bdce5650929db8ead670f12da2f59f54
    poc SHA tested: 5cc8e8f97cc8fa139248ff3e6c28612df31aa8a9
    result: 29 PASS / 0 FAIL / 0 BLOCKED
```

Historical FAIL/BLOCKED evidence remains preserved; later PASS evidence does not rewrite earlier sessions. Phase 9B3B sessions `s01`, `s02` and `s03` disproved the earlier assumption that directory navigation should be modeled as `filePicker.openDirectory` plus a current-location change. The final disclosure discovery established the real AppKit outline semantics and the public selection/expansion checkpoint physically validated the corrected contract. Phase 9B3C likewise preserves its earlier blocked/failing sessions and promotes only the authoritative s03 checkpoint.

System-chrome checkpoints:

```text
9C1A menu bar observation: cc-phase9c1a-menu-bar-observation-s02
    evidence: decc4ccd989c694e624e3c3db69884b6903b0cee
    validated product: d0d1d23eedb7258d1fc292e3647559cf96d726d5
    test source: 2018e5ede25b44dc5f68285ce103ec5eb3355bfd
    poc SHA tested: 0cb4359a18040d0d51c0ab3546375e6d7ac5cf7f
    result: 31 PASS / 0 FAIL / 0 BLOCKED

9C2+9C3 combined topology discovery: cc-phase9c23-system-chrome-discovery-s01
    evidence: f68f5bc4bc3e2fec2aa1219b402b7016107a6e6f
    observed product: 979ecb74dd486da832a96f02486dec7e71b42236
    test source: 35ba8c86cbfa3c23ef513410e658e000af8b1a2e
    poc SHA tested: 037d6b40d5eb342607e686637931d458be0d20b9
    result: 32 PASS / 0 FAIL / 0 BLOCKED

9C2A Dock observation: cc-phase9c2a-dock-observation-s02
    evidence: 5662b659a3b80c236db323dfe09125b56b48eca6
    validated product: b9d04f5213c5dcb00ca8dc0363f8248caa9a8916
    test source: c928f3dacd3c3456072d21baaef2742e042e5b0d
    poc SHA tested: 670cc9bd80d5d7f9fb315669a0f3e30e9f20b758
    result: 33 PASS / 0 FAIL / 0 BLOCKED

9C3A menu extras observation: cc-phase9c3a-menu-extras-observation-s01
    evidence: 5cc824a2209da7ad0de4feaa3cf0eff75ce42e55
    validated product: 042d587299852f517022e6792874ec4fae7d826c
    test source: f4946f51b39a64e870c5c4a3ee3e73e1cab1e147
    poc SHA tested: 71eba71f346a3462b5d358385932ed2b7a943491
    result: 34 PASS / 0 FAIL / 0 BLOCKED
```

The earlier Phase 9C2A s01 evidence is preserved with overall `FAIL`: its dedicated physical Dock test passed, but a discovery-era guard still forbade `dock.observe`. The s02 checkpoint corrected only that stale lifecycle assertion while testing the identical product SHA. Phase 9C3A then physically validated the public menu-extras observation against an independent AX oracle while treating volatile values such as clock/battery text as volatile rather than requiring byte-identical snapshots.

Phase 9D checkpoints:

```text
9D display/clipboard discovery: cc-phase9d-display-clipboard-discovery-s01
    evidence: c70e0e581c54ee67d9f56c4400ef3a942012629e
    observed product: 6e651f4c226e670ea45ed4b0139b3fe0eff8baac
    test source: 68c76aa89d838641baac95abff4f89f47ac96d19
    poc SHA tested: cb01e84d7e4901448d584c4075a7d28e97bda65b
    result: PASS

9D1A display observation: cc-phase9d1a-display-observation-s01
    evidence: a7788371d7b6d446e783a714112643ba093f2814
    validated product: 25c9052c514926f783d6c315cad2e14a5fa55311
    test source: a7bd10dc6d522014e1c262a5691ad93c2f5245dd
    poc SHA tested: 5d67cd4f3f10c05c31e590698a94809a328a49f4
    result: 36 PASS / 0 FAIL / 0 BLOCKED
```

The 9D1A checkpoint used an independent AppKit/CoreGraphics oracle and matched the public semantic display vector exactly. Its physical scope is the current reference topology: one built-in Retina display. Multi-monitor, external-display, mirroring, rotation and hot-plug combinations remain additional conformance surfaces rather than claims made by that checkpoint.

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

### Phase 9B2 — dialog semantic actions — COMPLETE on AppKit reference surface

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

Status: `PHYSICALLY_VALIDATED` on the deterministic Cocoa/AppKit `NSAlert` sheet fixture.

### Phase 9B3 — native file picker

9B3 is split deliberately so observation is validated before mutation and picker dismissal is validated after selection/expansion.

#### Phase 9B3A — observation — COMPLETE on AppKit reference surface

Public API:

```js
client.observeFilePicker({application})
```

The physical discovery established that, on the tested macOS 26.5.2 AppKit surface, the `NSOpenPanel` is Accessibility-visible inside the Provider application's AX tree even though AppKit may use separate implementation services internally. Global focused-application data may be unavailable and is not required for targeting.

Contract decisions:

- Provider-scoped, fresh native AX observation;
- no implicit launch or activation;
- `picker:null` is normal when no picker is open;
- current location is the visible native location label, not an inferred absolute path;
- visible items expose only semantic name/kind/selected/enabled state;
- expanded outline descendants can become visible while current location remains unchanged;
- PIDs, AX identifiers, handles and coordinates stay backend-private;
- repeated observation is non-invasive.

Status: `PHYSICALLY_VALIDATED` on the deterministic Cocoa/AppKit `NSOpenPanel` fixture.

#### Phase 9B3B — selection and hierarchical directory expansion — COMPLETE on AppKit reference surface

Public APIs:

```js
client.selectFilePickerItem({application, name, timeoutMs})
client.expandFilePickerDirectory({application, name, timeoutMs})
```

Contract decisions:

- both require one already-open supported picker;
- `name` addresses one currently visible item by exact observed name, never an arbitrary filesystem path;
- duplicate visible names fail as ambiguous;
- selection only targets an enabled observed item and succeeds only after fresh observation reports exactly that item selected;
- directory expansion requires the observed item kind to be `directory`;
- expansion rebinds the native row, resolves its `AXDisclosureTriangle`, requires advertised `AXPress`, and invokes only that semantic action;
- success requires a separate fresh native observation of `AXDisclosing=true`;
- an already expanded directory succeeds idempotently without another press;
- independent `filePicker.observe` may expose newly visible descendants such as `Nested.txt` while `location` remains unchanged;
- the picker must remain open;
- neither operation accepts/cancels the picker or mutates the filesystem;
- no `AXConfirm`, `AXOpen`, keyboard, clipboard, mouse coordinates, synthetic double-click or filesystem enumeration is a fallback mechanism;
- native AX item identity is rebound on every operation and remains backend-private.

The earlier unvalidated `filePicker.openDirectory` contract was removed before promotion because physical evidence showed that neither `AXConfirm` nor `AXOpen` represented the required location-change semantics on the reference `NSOpenPanel`.

Status: `PHYSICALLY_VALIDATED` on the deterministic Cocoa/AppKit `NSOpenPanel` fixture.

#### Phase 9B3C — accept and cancel — COMPLETE on AppKit reference surface

Public APIs:

```js
client.acceptFilePicker({application, timeoutMs})
client.cancelFilePicker({application, timeoutMs})
```

Contract decisions:

- both require one already-open supported picker in exactly one registered Provider process;
- neither launches nor activates the application implicitly;
- accept is an explicit caller semantic intent and resolves only through native `AXDefaultButton`;
- cancel resolves only through native `AXCancelButton`;
- visible button labels never choose or authorize an action;
- disabled or unavailable semantic buttons fail explicitly;
- only an advertised `AXPress` action is delivered;
- success requires the Provider application to remain running and a fresh independent picker observation to report no picker;
- application exit is not silently treated as success;
- no coordinates, mouse, keyboard, clipboard, synthetic keypress, filesystem operation or label-matching fallback is allowed;
- native AX objects and internal identifiers remain backend-private.

The authoritative s03 physical checkpoint independently proved both accept and cancel paths, including picker dismissal while the Provider remained running and an independent AppKit completion observation.

Status: `PHYSICALLY_VALIDATED` on the deterministic Cocoa/AppKit `NSOpenPanel` fixture.

### Phase 9C — system chrome — OBSERVATION COMPLETE on macOS reference surface

Phase 9C is split by surface and by observation versus any future mutation. The application menu bar is Provider-scoped; Dock and menu extras are OS-owned global surfaces. Native Accessibility identifiers and advertised actions remain backend-private.

The three read-only observation surfaces are now physically validated. This does not imply that generic mutation APIs exist or are semantically valid. Any later mutation remains separate and must provide an independently observable semantic postcondition; otherwise it belongs only in the explicit low-level fallback layer.

#### Phase 9C1A — application menu bar observation — COMPLETE on AppKit reference surface

Public API:

```js
client.observeMenuBar({application})
```

Contract decisions:

- Provider-scoped read-only native Accessibility observation;
- no implicit launch or activation;
- semantic menu item title/enabled/tree state only;
- native AX objects, identifiers, action names and coordinates stay backend-private;
- no menu item is invoked as part of observation.

Status: `PHYSICALLY_VALIDATED` on the tested macOS AppKit/Accessibility surface.

#### Phase 9C2A — Dock observation — COMPLETE on macOS reference surface

Public API:

```js
client.observeDock()
```

Contract decisions:

- global OS-owned read-only observation;
- public items expose only semantic `kind`, visible `title`, application `running` state and visible `status` where available;
- native Dock subroles are used only for backend-private canonicalization;
- native URLs, bundle/PID identity, AX objects, native action names and coordinates remain private;
- array order is observed Accessibility child order, not a coordinate contract;
- no Dock action or mutation is delivered.

Status: `PHYSICALLY_VALIDATED` on the tested macOS Dock Accessibility surface. See `docs/evidence/phase9c2a-dock-observation-physical.md`.

#### Phase 9C3A — menu extras observation — COMPLETE on macOS reference surface

Public API:

```js
client.observeMenuExtras()
```

Contract decisions:

- global OS-owned read-only observation across the supported macOS menu-extra owners discovered in the combined Phase 9C2+9C3 topology checkpoint;
- public items expose only semantic `title`, `description`, `value` and `enabled` state;
- anonymous disabled native menu-extra nodes remain anonymous rather than receiving guessed identities;
- internal `com.apple.menuextra.*` identifiers, owner bundle identity, AX roles/subroles, action names, objects, PIDs and coordinates remain backend-private;
- native advertised `AXPress`/`AXCancel` actions do not define a generic semantic invocation contract;
- no menu-extra mutation is performed by observation.

Status: `PHYSICALLY_VALIDATED` on the tested macOS menu-extras Accessibility surface. See `docs/evidence/phase9c3a-menu-extras-observation-physical.md`.

### Phase 9D — displays and richer clipboard

Phase 9D is split so OS-owned observation is established before richer clipboard payload access or mutation.

#### Phase 9D1A — display observation — COMPLETE on current macOS reference topology

Public API:

```js
client.listDisplays()
```

Contract decisions:

- global OS-owned read-only observation;
- public display state is limited to `name`, logical `bounds`, logical `usableBounds`, `scale`, `rotationDegrees`, `primary`, `builtIn`, `active` and `online`;
- `CGDirectDisplayID`, `NSScreenNumber` and other platform handles remain backend-private;
- discovery did not justify exposing `pixelWidth` / `pixelHeight` as portable physical-pixel dimensions;
- array order is observation order and not durable display identity;
- no display configuration, mode switch, screenshot or input action is part of observation.

Status: `PHYSICALLY_VALIDATED` on the current one-display Retina reference topology. See `docs/evidence/phase9d1a-display-observation-physical.md`. Multi-monitor/external-display variants remain additional conformance coverage.

#### Phase 9D2A — clipboard metadata observation

Public API:

```js
client.observeClipboard()
```

Contract decisions:

- global OS-owned metadata-only observation of the general clipboard/pasteboard;
- no clipboard payload bytes or text are read by this capability;
- public `revision` is opaque and observation-scoped;
- item `index` is meaningful only together with that revision;
- supported canonical metadata formats are `text/plain`, `text/html`, `text/rtf` and `image/png`;
- native UTI/type names remain backend-private;
- unknown/private native types are represented only by `unsupportedFormatCount`;
- metadata enumeration is guarded by before/after revision equality and fails if the clipboard changes mid-observation;
- existing text `clipboard.read/write/copy/paste` semantics remain unchanged.

Status: `IMPLEMENTED`; dedicated physical runtime/SDK validation is pending. See `docs/api-clipboard.md`.

#### Phase 9D2B — typed clipboard read — PENDING

Typed payload access remains separate from metadata observation. The intended safety direction is revision + item index + canonical format with stale-revision rejection; payload representation, size limits and physical validation scope must be fixed before implementation.

#### Phase 9D2C — typed clipboard write — PENDING

Typed clipboard mutation remains separate again and will require an independently observed readback/postcondition. It must not weaken or silently replace the existing exact text `clipboard.write` contract.

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