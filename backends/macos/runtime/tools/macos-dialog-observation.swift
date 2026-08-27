import Foundation
import ApplicationServices
import Darwin

struct DialogButton: Codable {
    let label: String?
    let enabled: Bool?
}

struct DialogObservation: Codable {
    let kind: String
    let title: String?
    let texts: [String]
    let modal: Bool?
    let buttons: [DialogButton]
}

struct Observation: Codable {
    let ok: Bool
    let state: String
    let dialogs: [DialogObservation]
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

func role(_ element: AXUIElement) -> String {
    return stringAttribute(element, kAXRoleAttribute as CFString) ?? ""
}

func subrole(_ element: AXUIElement) -> String {
    return stringAttribute(element, kAXSubroleAttribute as CFString) ?? ""
}

func label(_ element: AXUIElement) -> String? {
    for attribute in [kAXTitleAttribute, kAXDescriptionAttribute, kAXValueAttribute, kAXHelpAttribute] {
        if let value = stringAttribute(element, attribute as CFString), !value.isEmpty { return value }
    }
    return nil
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

func canonicalKind(_ element: AXUIElement) -> String {
    return role(element) == "AXSheet" ? "sheet" : "dialog"
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

func dialogObservation(_ element: AXUIElement) -> DialogObservation {
    let nodes = descendants(element)
    var texts: [String] = []
    var buttons: [DialogButton] = []
    for node in nodes {
        let r = role(node)
        if r == "AXStaticText", let value = label(node), !texts.contains(value) { texts.append(value) }
        if r == "AXButton" {
            buttons.append(DialogButton(label: label(node), enabled: boolAttribute(node, kAXEnabledAttribute as CFString)))
        }
    }
    return DialogObservation(
        kind: canonicalKind(element),
        title: label(element),
        texts: texts,
        modal: boolAttribute(element, "AXModal" as CFString),
        buttons: buttons
    )
}

func emit(_ observation: Observation, exitCode: Int32 = 0) -> Never {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    if let data = try? encoder.encode(observation), let text = String(data: data, encoding: .utf8) { print(text) }
    Darwin.exit(exitCode)
}

guard CommandLine.arguments.count >= 2, let parsedPid = Int32(CommandLine.arguments[1]), parsedPid > 0 else {
    emit(Observation(ok:false,state:"FAILED",dialogs:[],method:"macos-native-ax-dialog-observation",error:"INVALID_PID",detail:"usage: helper <pid>"), exitCode:2)
}
guard AXIsProcessTrusted() else {
    emit(Observation(ok:false,state:"FAILED",dialogs:[],method:"macos-native-ax-dialog-observation",error:"ACCESSIBILITY_PERMISSION_REQUIRED",detail:"macOS Accessibility permission is required"), exitCode:3)
}

let app = AXUIElementCreateApplication(pid_t(parsedPid))
var roots: [AXUIElement] = []
for window in elementsAttribute(app, kAXWindowsAttribute as CFString) { appendUnique(window, to: &roots) }
for child in children(app) { appendUnique(child, to: &roots) }

var candidates: [AXUIElement] = []
for root in roots {
    if isDialog(root) { appendUnique(root, to: &candidates) }
    for node in descendants(root) where isDialog(node) { appendUnique(node, to: &candidates) }
}

emit(Observation(ok:true,state:"OBSERVED",dialogs:candidates.map(dialogObservation),method:"macos-native-ax-dialog-observation",error:nil,detail:nil))
