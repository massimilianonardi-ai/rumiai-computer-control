import ApplicationServices
import Foundation

struct Output: Codable {
    let ok: Bool
    let state: String
    let action: String
    let name: String
    let kind: String?
    let previousSelected: Bool?
    let observedSelected: Bool?
    let idempotent: Bool
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
func actionNames(_ element: AXUIElement) -> [String] {
    var raw: CFArray?
    guard AXUIElementCopyActionNames(element, &raw) == .success, let raw else { return [] }
    return raw as? [String] ?? []
}
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
    let name = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    return name.isEmpty ? nil : name
}
func itemKind(_ row: AXUIElement) -> String {
    findFirst(row, depth: 5, predicate: { role($0) == (kAXDisclosureTriangleRole as String) }) != nil ? "directory" : "file"
}
func setSelected(_ row: AXUIElement) -> AXError {
    let picked = AXUIElementPerformAction(row, kAXPickAction as CFString)
    if picked == .success { return picked }
    var settable = DarwinBoolean(false)
    let check = AXUIElementIsAttributeSettable(row, kAXSelectedAttribute as CFString, &settable)
    if check == .success && settable.boolValue {
        return AXUIElementSetAttributeValue(row, kAXSelectedAttribute as CFString, kCFBooleanTrue)
    }
    return picked
}
func performAdvertisedDirectoryOpen(_ row: AXUIElement) -> AXError {
    var candidates: [AXUIElement] = []
    collect(row, depth: 5, predicate: { _ in true }, into: &candidates)
    let preferred = ["AXOpen", kAXConfirmAction as String]
    for actionName in preferred {
        for element in candidates where actionNames(element).contains(actionName) {
            let result = AXUIElementPerformAction(element, actionName as CFString)
            if result == .success { return result }
            if result != .actionUnsupported { return result }
        }
    }
    return .actionUnsupported
}

let pid: pid_t = CommandLine.arguments.count > 1 ? pid_t(CommandLine.arguments[1]) ?? 0 : 0
let action = CommandLine.arguments.count > 2 ? CommandLine.arguments[2] : ""
let requestedName = CommandLine.arguments.count > 3 ? CommandLine.arguments[3] : ""
let method = "macos-provider-scoped-native-AX-file-picker-item-action"
let encoder = JSONEncoder(); encoder.outputFormatting = [.sortedKeys]
func emit(_ output: Output, _ code: Int32) -> Never {
    if let data = try? encoder.encode(output) { FileHandle.standardOutput.write(data); FileHandle.standardOutput.write(Data("\n".utf8)) }
    exit(code)
}
func fail(_ error: String, _ detail: String, kind: String? = nil, previous: Bool? = nil) -> Never {
    emit(Output(ok:false,state:"FAILED",action:action,name:requestedName,kind:kind,previousSelected:previous,observedSelected:previous,idempotent:false,method:method,error:error,detail:detail),1)
}

guard pid > 0 else { fail("FILE_PICKER_TARGET_PID_UNAVAILABLE", "positive application pid required") }
guard action == "select" || action == "open-directory" else { fail("FILE_PICKER_ACTION_INVALID", "action must be select or open-directory") }
guard !requestedName.isEmpty else { fail("FILE_PICKER_ITEM_NAME_REQUIRED", "non-empty item name required") }

let application = AXUIElementCreateApplication(pid)
let windows = elements(application, kAXWindowsAttribute as CFString)
var sheets: [AXUIElement] = []
for window in windows { collect(window, predicate: isOpenPanel, into: &sheets) }
guard sheets.count == 1 else { fail(sheets.isEmpty ? "FILE_PICKER_NOT_FOUND" : "FILE_PICKER_AMBIGUOUS", "expected exactly one supported native file picker; observed \(sheets.count)") }
let sheet = sheets[0]
guard let list = findFirst(sheet, predicate: { identifier($0) == "ListView" }) else { fail("FILE_PICKER_LIST_UNAVAILABLE", "native picker list view unavailable") }
var rows: [AXUIElement] = []
collect(list, depth: 3, predicate: { role($0) == (kAXRowRole as String) }, into: &rows)
let matches = rows.filter { itemName($0) == requestedName }
guard matches.count == 1 else { fail(matches.isEmpty ? "FILE_PICKER_ITEM_NOT_FOUND" : "FILE_PICKER_ITEM_AMBIGUOUS", "expected exactly one visible item named \(requestedName); observed \(matches.count)") }
let row = matches[0]
let kind = itemKind(row)
let enabled = boolAttribute(row, kAXEnabledAttribute as CFString)
guard enabled != false else { fail("FILE_PICKER_ITEM_DISABLED", "item is disabled", kind:kind, previous:boolAttribute(row,kAXSelectedAttribute as CFString)) }
let previous = boolAttribute(row, kAXSelectedAttribute as CFString)

if action == "select" {
    if previous == true { emit(Output(ok:true,state:"DELIVERED",action:action,name:requestedName,kind:kind,previousSelected:previous,observedSelected:true,idempotent:true,method:method,error:nil,detail:nil),0) }
    let delivered = setSelected(row)
    guard delivered == .success else { fail("FILE_PICKER_ITEM_SELECTION_FAILED", "native AX selection failed with code \(delivered.rawValue)", kind:kind, previous:previous) }
    let observed = boolAttribute(row, kAXSelectedAttribute as CFString)
    guard observed == true else { fail("FILE_PICKER_ITEM_SELECTION_UNVERIFIED", "native row did not report selected=true after delivery", kind:kind, previous:previous) }
    emit(Output(ok:true,state:"DELIVERED",action:action,name:requestedName,kind:kind,previousSelected:previous,observedSelected:observed,idempotent:false,method:method,error:nil,detail:nil),0)
}

guard kind == "directory" else { fail("FILE_PICKER_ITEM_NOT_DIRECTORY", "open-directory requires an observed directory item", kind:kind, previous:previous) }
if previous != true {
    let selected = setSelected(row)
    guard selected == .success && boolAttribute(row, kAXSelectedAttribute as CFString) == true else { fail("FILE_PICKER_DIRECTORY_SELECTION_FAILED", "directory could not be selected before opening", kind:kind, previous:previous) }
}
let opened = performAdvertisedDirectoryOpen(row)
guard opened == .success else {
    if opened == .actionUnsupported { fail("FILE_PICKER_DIRECTORY_OPEN_ACTION_UNAVAILABLE", "directory row and descendants advertise neither AXOpen nor AXConfirm", kind:kind, previous:previous) }
    fail("FILE_PICKER_DIRECTORY_OPEN_FAILED", "advertised native directory-open action failed with code \(opened.rawValue)", kind:kind, previous:previous)
}
emit(Output(ok:true,state:"DELIVERED",action:action,name:requestedName,kind:kind,previousSelected:previous,observedSelected:true,idempotent:false,method:method,error:nil,detail:nil),0)
