import AppKit
import Foundation

let method = "macos-native-clipboard-metadata-observation"
let pasteboard = NSPasteboard.general
let beforeRevision = pasteboard.changeCount

let canonicalOrder = ["text/plain", "text/html", "text/rtf", "image/png"]
let aliases: [String: String] = [
    NSPasteboard.PasteboardType.string.rawValue: "text/plain",
    "NSStringPboardType": "text/plain",
    "public.utf16-external-plain-text": "text/plain",
    "CorePasteboardFlavorType 0x75743136": "text/plain",
    NSPasteboard.PasteboardType.html.rawValue: "text/html",
    "Apple HTML pasteboard type": "text/html",
    NSPasteboard.PasteboardType.rtf.rawValue: "text/rtf",
    "NeXT Rich Text Format v1.0 pasteboard type": "text/rtf",
    NSPasteboard.PasteboardType.png.rawValue: "image/png",
    "Apple PNG pasteboard type": "image/png",
]

var items: [[String: Any]] = []
for (index, item) in (pasteboard.pasteboardItems ?? []).enumerated() {
    var observed = Set<String>()
    var unsupportedFormatCount = 0
    for type in item.types {
        if let canonical = aliases[type.rawValue] {
            observed.insert(canonical)
        } else {
            unsupportedFormatCount += 1
        }
    }
    let formats = canonicalOrder.filter { observed.contains($0) }
    items.append([
        "index": index,
        "formats": formats,
        "unsupportedFormatCount": unsupportedFormatCount,
    ])
}

let afterRevision = pasteboard.changeCount
if beforeRevision != afterRevision {
    let result: [String: Any] = [
        "ok": false,
        "state": "STALE",
        "error": "CLIPBOARD_CHANGED_DURING_OBSERVATION",
        "detail": "The general pasteboard changed while clipboard metadata was being observed",
        "method": method,
    ]
    let data = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data([0x0a]))
    exit(2)
}

let result: [String: Any] = [
    "ok": true,
    "state": "OBSERVED",
    "revision": String(afterRevision),
    "items": items,
    "method": method,
]
let data = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
FileHandle.standardOutput.write(data)
FileHandle.standardOutput.write(Data([0x0a]))
