#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)

required_paths="
contract/VERSION
CHANGELOG.md
contract/schemas/common.schema.json
contract/schemas/runtime-info.schema.json
contract/schemas/operation-result.schema.json
contract/schemas/set-text.params.schema.json
contract/schemas/snapshot.params.schema.json
contract/schemas/find.params.schema.json
contract/schemas/application.params.schema.json
contract/schemas/element-observation.params.schema.json
contract/schemas/interaction.params.schema.json
contract/schemas/clipboard.params.schema.json
contract/schemas/synchronization.params.schema.json
contract/schemas/window.params.schema.json
runtime/README.md
runtime/src/server.js
runtime/src/router.js
backends/macos/README.md
backends/macos/legacy-validated-backend.js
backends/windows/README.md
backends/linux/README.md
adapters/mcp/README.md
sdk/typescript/src/index.js
docs/architecture.md
docs/development-workflow.md
docs/versioning.md
docs/security.md
docs/promotions/v46-strict-set-text.md
conformance/results/2026-08-25-runtime-set-text-boundary-PASS.md
conformance/results/2026-08-25-macos-snapshot-find-set-text-physical-PASS.md
conformance/results/2026-08-25-macos-application-observation-physical-PASS.md
conformance/results/2026-08-25-macos-interaction-clipboard-physical-PASS.md
conformance/results/2026-08-25-macos-synchronization-physical-PASS.md
conformance/physical-tests/macos-window-v82.js
conformance/results/2026-08-25-macos-window-v82-physical-PASS.md
"

for relative_path in $required_paths; do
  test -f "$root/$relative_path"
done

for schema in "$root"/contract/schemas/*.json "$root"/contract/examples/*.json; do
  python3 -m json.tool "$schema" >/dev/null
done

echo "computer-control-structure=PASS"
