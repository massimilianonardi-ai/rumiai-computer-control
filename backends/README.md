# OS backends

Each backend implements the canonical contract using the strongest available
native semantic primitive.

Preferred implementations:

- macOS: Swift with AXUIElement/ApplicationServices and CoreGraphics fallbacks.
- Windows: C#/.NET with Windows UI Automation.
- Linux: Rust with AT-SPI/D-Bus and Wayland-aware native primitives.

Native and positional handles are runtime-private. Backends must re-observe and
re-resolve ephemeral targets immediately before actions when required.
