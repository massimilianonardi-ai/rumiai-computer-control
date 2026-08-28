import AppKit
import Foundation

let method = "macos-native-clipboard-typed-read"
let pasteboard = NSPasteboard.general
let arguments = CommandLine.arguments

func emit(_ object: [String: Any], exitCode: Int32) -> Never {
    let data = try! JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data([0x0a]))
    exit(exitCode)
}

func fail(_ error: String, _ detail: String, state: String = "FAILED", exitCode: Int32 = 1) -> Never {
    emit(["ok": false, "state": state, "error": error, "detail": detail, "method": method], exitCode: exitCode)
}

guard arguments.count == 5 else {
    fail("CLIPBOARD_TYPED_READ_INVALID_ARGUMENTS", "Expected revision, item index, canonical format and maximum byte count")
}

let requestedRevision = arguments[1]
guard !requestedRevision.isEmpty else {
    fail("CLIPBOARD_REVISION_REQUIRED", "Typed clipboard read requires a non-empty revision")
}
guard let itemIndex = Int(arguments[2]), itemIndex >= 0 else {
    fail("CLIPBOARD_ITEM_INDEX_INVALID", "Typed clipboard read requires a non-negative item index")
}
let canonicalFormat = arguments[3]
guard let maxBytes = Int(arguments[4]), maxBytes > 0 else {
    fail("CLIPBOARD_TYPED_READ_INVALID_ARGUMENTS", "Typed clipboard read requires a positive maximum byte count")
}

let aliases: [String: [NSPasteboard.PasteboardType]] = [
    "text/plain": [
        .string,
        NSPasteboard.PasteboardType("NSStringPboardType"),
        NSPasteboard.PasteboardType("public.utf16-external-plain-text"),
        NSPasteboard.PasteboardType("CorePasteboardFlavorType 0x75743136"),
    ],
    "text/html": [
        .html,
        NSPasteboard.PasteboardType("Apple HTML pasteboard type"),
    ],
    "text/rtf": [
        .rtf,
        NSPasteboard.PasteboardType("NeXT Rich Text Format v1.0 pasteboard type"),
    ],
    "image/png": [
        .png,
        NSPasteboard.PasteboardType("Apple PNG pasteboard type"),
    ],
]

guard let preferredTypes = aliases[canonicalFormat] else {
    fail("CLIPBOARD_FORMAT_UNSUPPORTED", "Unsupported canonical clipboard format")
}

let beforeRevision = String(pasteboard.changeCount)
guard beforeRevision == requestedRevision else {
    fail("CLIPBOARD_REVISION_STALE", "The general pasteboard revision no longer matches the requested observation", state: "STALE", exitCode: 2)
}

guard let items = pasteboard.pasteboardItems, itemIndex < items.count else {
    fail("CLIPBOARD_ITEM_NOT_FOUND", "The requested pasteboard item does not exist at the observed revision")
}
let item = items[itemIndex]
let advertised = Set(item.types.map { $0.rawValue })
guard let nativeType = preferredTypes.first(where: { advertised.contains($0.rawValue) }) else {
    fail("CLIPBOARD_FORMAT_NOT_AVAILABLE", "The requested canonical format is not advertised for the observed item")
}

guard let payload = item.data(forType: nativeType) else {
    fail("CLIPBOARD_PAYLOAD_UNAVAILABLE", "The advertised clipboard payload could not be read")
}

guard payload.count <= maxBytes else {
    fail("CLIPBOARD_PAYLOAD_TOO_LARGE", "The clipboard payload exceeds the configured byte limit")
}

let afterRevision = String(pasteboard.changeCount)
guard afterRevision == requestedRevision else {
    fail("CLIPBOARD_CHANGED_DURING_READ", "The general pasteboard changed while the typed payload was being read", state: "STALE", exitCode: 2)
}

emit([
    "ok": true,
    "state": "READ",
    "revision": afterRevision,
    "itemIndex": itemIndex,
    "format": canonicalFormat,
    "byteCount": payload.count,
    "dataBase64": payload.base64EncodedString(),
    "method": method,
], exitCode: 0)
