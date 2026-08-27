import ApplicationServices
import Foundation

struct Output: Codable {
    let ok: Bool
    let state: String
    let name: String
    let kind: String?
    let expanded: Bool?
    let method: String
    let error: String?
    let detail: String?
}

func copyAttribute(_ element: AXUIElement, _ attribute: CFString) -> CFTypeRef? {
    var value: CFTypeRef?
    return AXUIElementCopyAttributeValue(element, attribute, &value) == .success ? value : nil
}
func stringAttribute(_ element: AXUIElement, _ attribute: CFString) -> String? {
    guard let raw = copyAttribute(element, attribute) else { return nil }
    return CFGetTypeID(raw) == CFStringGetTypeID() ? raw as? String : nil
}
func boolAttribute(_ element: AXUIElement, _ attribute: CFString) -> Bool? {
    guard let raw = copyAttribute(element, attribute) else { return nil }
    if CFGetTypeID(raw) == CFBooleanGetTypeID() { return CFBooleanGetValue(raw as! CFBoolean) }
    if let number = raw as? NSNumber { return number.boolValue }
    return nil
}
func elements(_ element: AXUIElement, _ attribute: CFString) -> [AXUIElement] {
    guard let raw = copyAttribute(element, attribute) else { return [] }
    return raw as? [AXUIElement] ?? []
}
func children(_ element: AXUIElement) -> [AXUIElement] { elements(element, kAXChildrenAttribute as CFString) }
func role(_ element: AXUIElement) -> String? { stringAttribute(element, kAXRoleAttribute as CFString) }
func identifier(_ element: AXUIElement) -> String? { stringAttribute(element, kAXIdentifierAttribute as CFString) }
func findFirst(_ root: AXUIElement, depth: Int = 12, predicate: (AXUIElement) -> Bool) -> AXUIElement? {
    if predicate(root) { return root }
    if depth <= 0 { return nil }
    for child in children(root) { if let found = findFirst(child, depth: depth - 1, predicate: predicate) { return found } }
    return nil
}
func collect(_ root: AXUIElement, depth: Int = 12, predicate: (AXUIElement) -> Bool, into result: inout [AXUIElement]) {
    if predicate(root) { result.append(root) }
    if depth <= 0 { return }
    for child in children(root) { collect(child, depth: depth - 1, predicate: predicate, into: &result) }
}
func hasDescendant(_ root: AXUIElement, identifier expected: String) -> Bool {
    findFirst(root, predicate: { identifier($0) == expected }) != nil
}
func isOpenPanel(_ element: AXUIElement) -> Bool {
    guard role(element) == (kAXSheetRole as String) else { return false }
    if identifier(element) == "open-panel" { return true }
    return hasDescendant(element, identifier: "ListView") && hasDescendant(element, identifier: "OKButton") && hasDescendant(element, identifier: "CancelButton")
}
func itemName(_ row: AXUIElement) -> String? {
    guard let field = findFirst(row, depth: 5, predicate: { role($0) == (kAXTextFieldRole as String) && stringAttribute($0, kAXValueAttribute as CFString) != nil }), let raw = stringAttribute(field, kAXValueAttribute as CFString) else { return nil }
    let value = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    return value.isEmpty ? nil : value
}

let pid: pid_t = CommandLine.arguments.count > 1 ? pid_t(CommandLine.arguments[1]) ?? 0 : 0
let requestedName = CommandLine.arguments.count > 2 ? CommandLine.arguments[2] : ""
let method = "macos-provider-scoped-native-AX-file-picker-directory-state"
let encoder = JSONEncoder(); encoder.outputFormatting = [.sortedKeys]
func emit(_ output: Output, _ code: Int32) -> Never {
    if let data = try? encoder.encode(output) { FileHandle.standardOutput.write(data); FileHandle.standardOutput.write(Data("\n".utf8)) }
    exit(code)
}
func fail(_ error: String, _ detail: String) -> Never {
    emit(Output(ok:false,state:"FAILED",name:requestedName,kind:nil,expanded:nil,method:method,error:error,detail:detail),1)
}

guard pid > 0 else { fail("FILE_PICKER_TARGET_PID_UNAVAILABLE", "positive application pid required") }
guard !requestedName.isEmpty else { fail("FILE_PICKER_ITEM_NAME_REQUIRED", "non-empty item name required") }
let application = AXUIElementCreateApplication(pid)
var sheets: [AXUIElement] = []
for window in elements(application, kAXWindowsAttribute as CFString) { collect(window, predicate: isOpenPanel, into: &sheets) }
guard sheets.count == 1 else { fail(sheets.isEmpty ? "FILE_PICKER_NOT_FOUND" : "FILE_PICKER_AMBIGUOUS", "expected exactly one supported native file picker; observed \(sheets.count)") }
guard let list = findFirst(sheets[0], predicate: { identifier($0) == "ListView" }) else { fail("FILE_PICKER_LIST_UNAVAILABLE", "native picker list view unavailable") }
var rows: [AXUIElement] = []
collect(list, depth: 5, predicate: { role($0) == (kAXRowRole as String) }, into: &rows)
let matches = rows.filter { itemName($0) == requestedName }
guard matches.count == 1 else { fail(matches.isEmpty ? "FILE_PICKER_ITEM_NOT_FOUND" : "FILE_PICKER_ITEM_AMBIGUOUS", "expected exactly one visible item named \(requestedName); observed \(matches.count)") }
let row = matches[0]
let isDirectory = findFirst(row, depth: 5, predicate: { role($0) == (kAXDisclosureTriangleRole as String) }) != nil
guard isDirectory else { fail("FILE_PICKER_ITEM_NOT_DIRECTORY", "directory state requires an observed directory item") }
emit(Output(ok:true,state:"OBSERVED",name:requestedName,kind:"directory",expanded:boolAttribute(row,kAXDisclosingAttribute as CFString),method:method,error:nil,detail:nil),0)
