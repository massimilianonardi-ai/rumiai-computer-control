import Foundation
import ApplicationServices
import Darwin

struct Result: Codable {
    let ok: Bool
    let state: String
    let action: String?
    let method: String
    let error: String?
    let detail: String?
}

func copyAttribute(_ element: AXUIElement, _ attribute: CFString) -> CFTypeRef? {
    var value: CFTypeRef?
    let error = AXUIElementCopyAttributeValue(element, attribute, &value)
    return error == .success ? value : nil
}

func stringAttribute(_ element: AXUIElement, _ attribute: CFString) -> String? {
    guard let value = copyAttribute(element, attribute) else { return nil }
    return value as? String
}

func boolAttribute(_ element: AXUIElement, _ attribute: CFString) -> Bool? {
    guard let value = copyAttribute(element, attribute) else { return nil }
    if let flag = value as? Bool { return flag }
    if let number = value as? NSNumber { return number.boolValue }
    return nil
}

func elementsAttribute(_ element: AXUIElement, _ attribute: CFString) -> [AXUIElement] {
    guard let value = copyAttribute(element, attribute) else { return [] }
    if let values = value as? [AXUIElement] { return values }
    if CFGetTypeID(value) == AXUIElementGetTypeID() { return [value as! AXUIElement] }
    return []
}

func elementAttribute(_ element: AXUIElement, _ attribute: CFString) -> AXUIElement? {
    guard let value = copyAttribute(element, attribute), CFGetTypeID(value) == AXUIElementGetTypeID() else { return nil }
    return value as! AXUIElement
}

func role(_ element: AXUIElement) -> String {
    return stringAttribute(element, kAXRoleAttribute as CFString) ?? ""
}

func subrole(_ element: AXUIElement) -> String {
    return stringAttribute(element, kAXSubroleAttribute as CFString) ?? ""
}

func appendUnique(_ element: AXUIElement, to values: inout [AXUIElement]) {
    if values.contains(where: { CFEqual($0, element) }) { return }
    values.append(element)
}

func children(_ element: AXUIElement) -> [AXUIElement] {
    var result: [AXUIElement] = []
    for attribute in [kAXChildrenAttribute as CFString, "AXSheets" as CFString] {
        for child in elementsAttribute(element, attribute) { appendUnique(child, to: &result) }
    }
    return result
}

func isDialog(_ element: AXUIElement) -> Bool {
    let r = role(element)
    let sr = subrole(element)
    return r == "AXSheet" || r == "AXDialog" || sr == "AXDialog"
}

func descendants(_ root: AXUIElement, maxNodes: Int = 10000) -> [AXUIElement] {
    var queue = children(root)
    var result: [AXUIElement] = []
    while !queue.isEmpty && result.count < maxNodes {
        let element = queue.removeFirst()
        if result.contains(where: { CFEqual($0, element) }) { continue }
        result.append(element)
        queue.append(contentsOf: children(element))
    }
    return result
}

func emit(_ result: Result, exitCode: Int32 = 0) -> Never {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    if let data = try? encoder.encode(result), let text = String(data: data, encoding: .utf8) { print(text) }
    Darwin.exit(exitCode)
}

let method = "macos-native-ax-dialog-semantic-action"
guard CommandLine.arguments.count >= 3, let parsedPid = Int32(CommandLine.arguments[1]), parsedPid > 0 else {
    emit(Result(ok:false,state:"FAILED",action:nil,method:method,error:"INVALID_PID",detail:"usage: helper <pid> <default|cancel>"), exitCode:2)
}
let action = CommandLine.arguments[2]
guard action == "default" || action == "cancel" else {
    emit(Result(ok:false,state:"FAILED",action:nil,method:method,error:"INVALID_DIALOG_ACTION",detail:"action must be default or cancel"), exitCode:2)
}
guard AXIsProcessTrusted() else {
    emit(Result(ok:false,state:"FAILED",action:action,method:method,error:"ACCESSIBILITY_PERMISSION_REQUIRED",detail:"macOS Accessibility permission is required"), exitCode:3)
}

let app = AXUIElementCreateApplication(pid_t(parsedPid))
var roots: [AXUIElement] = []
for window in elementsAttribute(app, kAXWindowsAttribute as CFString) { appendUnique(window, to: &roots) }
for child in children(app) { appendUnique(child, to: &roots) }
var dialogs: [AXUIElement] = []
for root in roots {
    if isDialog(root) { appendUnique(root, to: &dialogs) }
    for node in descendants(root) where isDialog(node) { appendUnique(node, to: &dialogs) }
}

guard dialogs.count == 1 else {
    let code = dialogs.isEmpty ? "DIALOG_NOT_FOUND" : "DIALOG_TARGET_AMBIGUOUS"
    emit(Result(ok:false,state:"FAILED",action:action,method:method,error:code,detail:"semantic dialog action requires exactly one native dialog; observed \(dialogs.count)"), exitCode:4)
}

let attribute: CFString = action == "default" ? kAXDefaultButtonAttribute as CFString : kAXCancelButtonAttribute as CFString
guard let button = elementAttribute(dialogs[0], attribute) else {
    let code = action == "default" ? "DIALOG_DEFAULT_ACTION_UNAVAILABLE" : "DIALOG_CANCEL_ACTION_UNAVAILABLE"
    emit(Result(ok:false,state:"FAILED",action:action,method:method,error:code,detail:"native Accessibility does not expose the requested semantic button"), exitCode:5)
}
if boolAttribute(button, kAXEnabledAttribute as CFString) == false {
    emit(Result(ok:false,state:"FAILED",action:action,method:method,error:"DIALOG_ACTION_DISABLED",detail:"native semantic dialog button is disabled"), exitCode:6)
}
let pressError = AXUIElementPerformAction(button, kAXPressAction as CFString)
guard pressError == .success else {
    emit(Result(ok:false,state:"FAILED",action:action,method:method,error:"DIALOG_ACTION_DELIVERY_FAILED",detail:"AXPress failed with error \(pressError.rawValue)"), exitCode:7)
}

emit(Result(ok:true,state:"DELIVERED",action:action,method:method,error:nil,detail:nil))
