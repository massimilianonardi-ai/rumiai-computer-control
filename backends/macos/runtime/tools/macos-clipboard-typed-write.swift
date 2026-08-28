import AppKit
import Foundation

let method = "macos-native-clipboard-typed-write"
let maxBytes = 16 * 1024 * 1024

func emit(_ object: [String: Any], exitCode: Int32 = 0) -> Never {
    let data = try! JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data([0x0a]))
    exit(exitCode)
}

let inputData = FileHandle.standardInput.readDataToEndOfFile()
guard
    let object = try? JSONSerialization.jsonObject(with: inputData) as? [String: Any],
    let format = object["format"] as? String,
    let dataBase64 = object["dataBase64"] as? String
else {
    emit(["ok": false, "state": "FAILED", "error": "CLIPBOARD_TYPED_WRITE_INVALID_INPUT", "detail": "Expected JSON stdin with format and dataBase64", "method": method], exitCode: 1)
}

let nativeType: NSPasteboard.PasteboardType
switch format {
case "text/plain": nativeType = .string
case "text/html": nativeType = .html
case "text/rtf": nativeType = .rtf
case "image/png": nativeType = .png
default:
    emit(["ok": false, "state": "FAILED", "error": "CLIPBOARD_FORMAT_UNSUPPORTED", "detail": "Unsupported canonical clipboard format", "method": method], exitCode: 1)
}

guard let payload = Data(base64Encoded: dataBase64), payload.base64EncodedString() == dataBase64 else {
    emit(["ok": false, "state": "FAILED", "error": "CLIPBOARD_PAYLOAD_INVALID_BASE64", "detail": "dataBase64 must be canonical base64", "method": method], exitCode: 1)
}
guard payload.count <= maxBytes else {
    emit(["ok": false, "state": "FAILED", "error": "CLIPBOARD_PAYLOAD_TOO_LARGE", "detail": "Typed clipboard payload exceeds 16 MiB", "method": method], exitCode: 1)
}

let pasteboard = NSPasteboard.general
let beforeRevision = pasteboard.changeCount
pasteboard.clearContents()

guard pasteboard.setData(payload, forType: nativeType) else {
    emit(["ok": false, "state": "UNVERIFIED", "error": "CLIPBOARD_TYPED_WRITE_DELIVERY_FAILED", "detail": "NSPasteboard rejected the requested typed payload", "method": method], exitCode: 1)
}

let afterRevision = pasteboard.changeCount
guard afterRevision != beforeRevision else {
    emit(["ok": false, "state": "UNVERIFIED", "error": "CLIPBOARD_TYPED_WRITE_REVISION_UNCHANGED", "detail": "Pasteboard revision did not change after typed write", "method": method], exitCode: 1)
}

guard let items = pasteboard.pasteboardItems, items.count == 1 else {
    emit(["ok": false, "state": "UNVERIFIED", "error": "CLIPBOARD_TYPED_WRITE_ITEM_STATE_UNVERIFIED", "detail": "Typed write did not produce exactly one pasteboard item", "method": method], exitCode: 1)
}
guard items[0].types.contains(nativeType) else {
    emit(["ok": false, "state": "UNVERIFIED", "error": "CLIPBOARD_TYPED_WRITE_FORMAT_UNVERIFIED", "detail": "Requested native representation is not advertised after write", "method": method], exitCode: 1)
}

emit([
    "ok": true,
    "state": "DELIVERED",
    "revision": String(afterRevision),
    "itemIndex": 0,
    "format": format,
    "byteCount": payload.count,
    "method": method,
])
