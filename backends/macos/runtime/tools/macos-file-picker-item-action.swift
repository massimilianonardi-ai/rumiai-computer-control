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
    let previousExpanded: Bool?
    let observedExpanded: Bool?
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
func trimmedValue(_ element: AXUIElement) -> String? {
    guard let raw = stringAttribute(element, kAXValueAttribute as CFString) else { return nil }
    let value = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    return value.isEmpty ? nil : value
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
    guard let field = findFirst(row, depth: 5, predicate: { role($0) == (kAXTextFieldRole as String) && trimmedValue($0) != nil }) else { return nil }
    return trimmedValue(field)
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

let pid: pid_t = CommandLine.arguments.count > 1 ? pid_t(CommandLine.arguments[1]) ?? 0 : 0
let action = CommandLine.arguments.count > 2 ? CommandLine.arguments[2] : ""
let requestedName = CommandLine.arguments.count > 3 ? CommandLine.arguments[3] : ""
let method = "macos-provider-scoped-native-AX-file-picker-item-action"
let encoder = JSONEncoder(); encoder.outputFormatting = [.sortedKeys]
func emit(_ output: Output, _ code: Int32) -> Never {
    if let data = try? encoder.encode(output) { FileHandle.standardOutput.write(data); FileHandle.standardOutput.write(Data("\n".utf8)) }
    exit(code)
}
func fail(_ error: String, _ detail: String, kind: String? = nil, previousSelected: Bool? = nil, previousExpanded: Bool? = nil) -> Never {
    emit(Output(ok:false,state:"FAILED",action:action,name:requestedName,kind:kind,previousSelected:previousSelected,observedSelected:previousSelected,previousExpanded:previousExpanded,observedExpanded:previousExpanded,idempotent:false,method:method,error:error,detail:detail),1)
}

guard pid > 0 else { fail("FILE_PICKER_TARGET_PID_UNAVAILABLE", "positive application pid required") }
guard action == "select" || action == "expand-directory" else { fail("FILE_PICKER_ACTION_INVALID", "action must be select or expand-directory") }
guard !requestedName.isEmpty else { fail("FILE_PICKER_ITEM_NAME_REQUIRED", "non-empty item name required") }

let application = AXUIElementCreateApplication(pid)
let windows = elements(application, kAXWindowsAttribute as CFString)
var sheets: [AXUIElement] = []
for window in windows { collect(window, predicate: isOpenPanel, into: &sheets) }
guard sheets.count == 1 else { fail(sheets.isEmpty ? "FILE_PICKER_NOT_FOUND" : "FILE_PICKER_AMBIGUOUS", "expected exactly one supported native file picker; observed \(sheets.count)") }
let sheet = sheets[0]
guard let list = findFirst(sheet, predicate: { identifier($0) == "ListView" }) else { fail("FILE_PICKER_LIST_UNAVAILABLE", "native picker list view unavailable") }
var rows: [AXUIElement] = []
collect(list, depth: 5, predicate: { role($0) == (kAXRowRole as String) }, into: &rows)
let matches = rows.filter { itemName($0) == requestedName }
guard matches.count == 1 else { fail(matches.isEmpty ? "FILE_PICKER_ITEM_NOT_FOUND" : "FILE_PICKER_ITEM_AMBIGUOUS", "expected exactly one visible item named \(requestedName); observed \(matches.count)") }
let row = matches[0]
let kind = itemKind(row)
let enabled = boolAttribute(row, kAXEnabledAttribute as CFString)
let previousSelected = boolAttribute(row, kAXSelectedAttribute as CFString)
guard enabled != false else { fail("FILE_PICKER_ITEM_DISABLED", "item is disabled", kind:kind, previousSelected:previousSelected) }

if action == "select" {
    if previousSelected == true { emit(Output(ok:true,state:"DELIVERED",action:action,name:requestedName,kind:kind,previousSelected:previousSelected,observedSelected:true,previousExpanded:nil,observedExpanded:nil,idempotent:true,method:method,error:nil,detail:nil),0) }
    let delivered = setSelected(row)
    guard delivered == .success else { fail("FILE_PICKER_ITEM_SELECTION_FAILED", "native AX selection failed with code \(delivered.rawValue)", kind:kind, previousSelected:previousSelected) }
    let observed = boolAttribute(row, kAXSelectedAttribute as CFString)
    guard observed == true else { fail("FILE_PICKER_ITEM_SELECTION_UNVERIFIED", "native row did not report selected=true after delivery", kind:kind, previousSelected:previousSelected) }
    emit(Output(ok:true,state:"DELIVERED",action:action,name:requestedName,kind:kind,previousSelected:previousSelected,observedSelected:observed,previousExpanded:nil,observedExpanded:nil,idempotent:false,method:method,error:nil,detail:nil),0)
}

guard kind == "directory" else { fail("FILE_PICKER_ITEM_NOT_DIRECTORY", "expand-directory requires an observed directory item", kind:kind, previousSelected:previousSelected) }
let previousExpanded = boolAttribute(row, kAXDisclosingAttribute as CFString)
if previousExpanded == true {
    emit(Output(ok:true,state:"DELIVERED",action:action,name:requestedName,kind:kind,previousSelected:previousSelected,observedSelected:previousSelected,previousExpanded:true,observedExpanded:true,idempotent:true,method:method,error:nil,detail:nil),0)
}
guard let triangle = findFirst(row, depth: 5, predicate: { role($0) == (kAXDisclosureTriangleRole as String) }) else {
    fail("FILE_PICKER_DIRECTORY_DISCLOSURE_UNAVAILABLE", "directory row has no AXDisclosureTriangle", kind:kind, previousSelected:previousSelected, previousExpanded:previousExpanded)
}
guard actionNames(triangle).contains(kAXPressAction as String) else {
    fail("FILE_PICKER_DIRECTORY_EXPAND_ACTION_UNAVAILABLE", "directory disclosure triangle does not advertise AXPress", kind:kind, previousSelected:previousSelected, previousExpanded:previousExpanded)
}
let pressed = AXUIElementPerformAction(triangle, kAXPressAction as CFString)
guard pressed == .success else {
    fail("FILE_PICKER_DIRECTORY_EXPAND_FAILED", "native AXPress on directory disclosure triangle failed with code \(pressed.rawValue)", kind:kind, previousSelected:previousSelected, previousExpanded:previousExpanded)
}
emit(Output(ok:true,state:"DELIVERED",action:action,name:requestedName,kind:kind,previousSelected:previousSelected,observedSelected:previousSelected,previousExpanded:previousExpanded,observedExpanded:nil,idempotent:false,method:method,error:nil,detail:nil),0)
