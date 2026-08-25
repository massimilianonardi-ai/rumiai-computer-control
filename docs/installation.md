# Installation on macOS

Release `v0.8.0` supports Apple Silicon and Intel macOS. It requires Node.js 20
or newer, the Xcode command-line tools, Accessibility permission, and network
access during installation.

From an extracted release archive:

```sh
chmod +x scripts/install.sh scripts/rumiai-computer-control
./scripts/install.sh
```

The default layout is:

```text
~/.local/lib/rumiai-computer-control/0.8.0
~/.local/lib/rumiai-computer-control/current -> 0.8.0
~/.local/bin/rumiai-computer-control
```

Use `--prefix PATH` or `RUMIAI_CC_INSTALL_PREFIX` for another self-contained
prefix. Existing version directories are never overwritten.

The installer downloads the architecture-specific `agent-ctrl` v0.1.4 binary,
verifies its pinned SHA-256 digest, and compiles the four native Swift helpers.
The downloaded dependency is maintained separately under the Apache-2.0
license; its release is available from `k4cper-g/agent-ctrl` on GitHub.
Run the installation check with:

```sh
~/.local/bin/rumiai-computer-control doctor
```

RumiAI resolves the adapter in this order: explicit
`RUMIAI_COMPUTER_CONTROL_ADAPTER`, installation home from
`RUMIAI_COMPUTER_CONTROL_HOME`, then the default `~/.local` installation.
