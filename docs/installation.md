# Installation on macOS

Release `v0.8.0` supports Apple Silicon and Intel macOS. It requires Node.js 20
or newer, the Xcode command-line tools, Accessibility permission, and network
access during installation.

RumiAI is portable by design. Computer Control must remain inside the RumiAI
project tree unless a future architecture decision documents a concrete reason
otherwise. Development and production installs must not write into the macOS
user profile or system locations, because ambient installations can mask
dependency and resolution errors.

From an extracted release archive:

```sh
chmod +x scripts/install.sh scripts/rumiai-computer-control
./scripts/install.sh --portable-root /absolute/path/to/RumiAI/bin
```

For RumiAI, the layout is entirely below its portable `bin` directory:

```text
/path/to/RumiAI/bin/rumiai-computer-control/0.8.0
/path/to/RumiAI/bin/rumiai-computer-control/current -> 0.8.0
```

`--portable-root` (or `RUMIAI_CC_PORTABLE_ROOT`) is mandatory. There is no
system-wide or user-profile default. The installer rejects `~/.local`, `/usr`,
`/opt`, `/Library`, and `/Applications`. Existing version directories are never
overwritten.

The installer downloads the architecture-specific `agent-ctrl` v0.1.4 binary,
verifies its pinned SHA-256 digest, and compiles the four native Swift helpers.
The downloaded dependency is maintained separately under the Apache-2.0
license; its release is available from `k4cper-g/agent-ctrl` on GitHub.
Run the installation check with:

```sh
/path/to/RumiAI/bin/rumiai-computer-control/current/scripts/rumiai-computer-control doctor
```

RumiAI resolves the adapter in this order: explicit
`RUMIAI_COMPUTER_CONTROL_ADAPTER`, installation home from
`RUMIAI_COMPUTER_CONTROL_HOME`, then its own portable
`$ROOT/bin/rumiai-computer-control/current` directory.
