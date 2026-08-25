#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)

required_paths="
contract/VERSION
contract/schemas/common.schema.json
contract/schemas/runtime-info.schema.json
contract/schemas/operation-result.schema.json
runtime/README.md
backends/macos/README.md
backends/windows/README.md
backends/linux/README.md
adapters/mcp/README.md
docs/architecture.md
docs/development-workflow.md
docs/versioning.md
docs/security.md
"

for relative_path in $required_paths; do
  test -f "$root/$relative_path"
done

for schema in "$root"/contract/schemas/*.json "$root"/contract/examples/*.json; do
  python3 -m json.tool "$schema" >/dev/null
done

echo "computer-control-structure=PASS"
