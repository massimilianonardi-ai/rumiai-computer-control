import ApplicationServices
import Foundation
import Darwin

struct Output: Codable {
    let ok: Bool
    let state: String
    let action: String?
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
    if let values = raw as? [AXUIElement] { return values }
    if CFGetTypeID(raw) == AXUIElementGetTypeID() { return [raw as! AXUIElement] }
    return []
}
func element(_ element: AXUIElement, _ attribute: CFString) -> AXUIElement? {
    guard let raw = copyAttribute(element, attribute), CFGetTypeID(raw) == AXUIElementGetTypeID() else { return nil }
    return raw as! AXUIElement
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
func emit(_ output: Output, _ code: Int32) -> Never {
    let encoder = JSONEncoder(); encoder.outputFormatting = [.sortedKeys]
    if let data = try? encoder.encode(output) { FileHandle.standardOutput.write(data); FileHandle.standardOutput.write(Data("\n".utf8)) }
    Darwin.exit(code)
}
func fail(_ action: String?, _ error: String, _ detail: String, _ code: Int32 = 1) -> Never {
    emit(Output(ok:false,state:"FAILED",action:action,method:"macos-provider-scoped-native-AX-file-picker-semantic-action",error:error,detail:detail),code)
}

let pid: pid_t = CommandLine.arguments.count > 1 ? pid_t(CommandLine.arguments[1]) ?? 0 : 0
let action = CommandLine.arguments.count > 2 ? CommandLine.arguments[2] : ""
let method = "macos-provider-scoped-native-AX-file-picker-semantic-action"
guard pid > 0 else { fail(nil,"FILE_PICKER_TARGET_PID_UNAVAILABLE","positive application pid required",2) }
guard action == "accept" || action == "cancel" else { fail(nil,"FILE_PICKER_ACTION_INVALID","action must be accept or cancel",2) }
guard AXIsProcessTrusted() else { fail(action,"ACCESSIBILITY_PERMISSION_REQUIRED","macOS Accessibility permission is required",3) }

let application = AXUIElementCreateApplication(pid)
var panels: [AXUIElement] = []
for window in elements(application, kAXWindowsAttribute as CFString) { collect(window, predicate: isOpenPanel, into: &panels) }
guard panels.count == 1 else {
    fail(action,panels.isEmpty ? "FILE_PICKER_NOT_FOUND" : "FILE_PICKER_AMBIGUOUS","semantic picker action requires exactly one supported native file picker; observed \(panels.count)",4)
}
let panel = panels[0]
let semanticAttribute: CFString = action == "accept" ? kAXDefaultButtonAttribute as CFString : kAXCancelButtonAttribute as CFString
guard let button = element(panel, semanticAttribute) else {
    fail(action,action == "accept" ? "FILE_PICKER_ACCEPT_ACTION_UNAVAILABLE" : "FILE_PICKER_CANCEL_ACTION_UNAVAILABLE","native Accessibility does not expose the requested semantic picker button",5)
}
guard boolAttribute(button, kAXEnabledAttribute as CFString) != false else {
    fail(action,"FILE_PICKER_ACTION_DISABLED","native semantic picker button is disabled",6)
}
guard actionNames(button).contains(kAXPressAction as String) else {
    fail(action,"FILE_PICKER_ACTION_PRESS_UNAVAILABLE","native semantic picker button does not advertise AXPress",7)
}
let delivered = AXUIElementPerformAction(button, kAXPressAction as CFString)
guard delivered == .success else {
    fail(action,"FILE_PICKER_ACTION_DELIVERY_FAILED","AXPress failed with error \(delivered.rawValue)",8)
}
emit(Output(ok:true,state:"DELIVERED",action:action,method:method,error:nil,detail:nil),0)
