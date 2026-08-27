import ApplicationServices
import Foundation

struct PickerItem: Codable {
    let name: String
    let kind: String
    let selected: Bool?
    let enabled: Bool?
}

struct PickerObservation: Codable {
    let kind: String
    let location: String?
    let items: [PickerItem]
}

struct Output: Codable {
    let ok: Bool
    let state: String
    let pickers: [PickerObservation]
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
    if CFGetTypeID(raw) == CFStringGetTypeID() { return raw as? String }
    if CFGetTypeID(raw) == CFURLGetTypeID(), let url = raw as? URL { return url.path }
    return nil
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

func children(_ element: AXUIElement) -> [AXUIElement] {
    return elements(element, kAXChildrenAttribute as CFString)
}

func role(_ element: AXUIElement) -> String? {
    return stringAttribute(element, kAXRoleAttribute as CFString)
}

func identifier(_ element: AXUIElement) -> String? {
    return stringAttribute(element, kAXIdentifierAttribute as CFString)
}

func findFirst(_ root: AXUIElement, depth: Int = 12, predicate: (AXUIElement) -> Bool) -> AXUIElement? {
    if predicate(root) { return root }
    if depth <= 0 { return nil }
    for child in children(root) {
        if let found = findFirst(child, depth: depth - 1, predicate: predicate) { return found }
    }
    return nil
}

func collect(_ root: AXUIElement, depth: Int = 12, predicate: (AXUIElement) -> Bool, into result: inout [AXUIElement]) {
    if predicate(root) { result.append(root) }
    if depth <= 0 { return }
    for child in children(root) { collect(child, depth: depth - 1, predicate: predicate, into: &result) }
}

func hasDescendant(_ root: AXUIElement, identifier expected: String) -> Bool {
    return findFirst(root, predicate: { identifier($0) == expected }) != nil
}

func isOpenPanel(_ element: AXUIElement) -> Bool {
    guard role(element) == (kAXSheetRole as String) else { return false }
    if identifier(element) == "open-panel" { return true }
    return hasDescendant(element, identifier: "ListView") &&
        hasDescendant(element, identifier: "OKButton") &&
        hasDescendant(element, identifier: "CancelButton")
}

func pickerItem(from row: AXUIElement) -> PickerItem? {
    guard let nameElement = findFirst(row, depth: 5, predicate: {
        role($0) == (kAXTextFieldRole as String) && stringAttribute($0, kAXValueAttribute as CFString) != nil
    }), let rawName = stringAttribute(nameElement, kAXValueAttribute as CFString) else { return nil }
    let name = rawName.trimmingCharacters(in: .whitespacesAndNewlines)
    if name.isEmpty { return nil }
    let isDirectory = findFirst(row, depth: 5, predicate: { role($0) == (kAXDisclosureTriangleRole as String) }) != nil
    let selected = boolAttribute(row, kAXSelectedAttribute as CFString)
    let enabled = boolAttribute(row, kAXEnabledAttribute as CFString) ?? boolAttribute(nameElement, kAXEnabledAttribute as CFString)
    return PickerItem(name: name, kind: isDirectory ? "directory" : "file", selected: selected, enabled: enabled)
}

func observePicker(_ sheet: AXUIElement) -> PickerObservation? {
    guard let list = findFirst(sheet, predicate: { identifier($0) == "ListView" }) else { return nil }
    let locationElement = findFirst(sheet, predicate: { identifier($0) == "where popup" })
    let location = locationElement.flatMap { stringAttribute($0, kAXValueAttribute as CFString) }
    var rows: [AXUIElement] = []
    collect(list, depth: 3, predicate: { role($0) == (kAXRowRole as String) }, into: &rows)
    let items = rows.compactMap(pickerItem)
    return PickerObservation(kind: "open", location: location, items: items)
}

let pid: pid_t = CommandLine.arguments.count > 1 ? pid_t(CommandLine.arguments[1]) ?? 0 : 0
let method = "macos-provider-scoped-native-AX-file-picker-observation"
let encoder = JSONEncoder()
encoder.outputFormatting = [.sortedKeys]

func emit(_ output: Output, exitCode: Int32) -> Never {
    if let data = try? encoder.encode(output) {
        FileHandle.standardOutput.write(data)
        FileHandle.standardOutput.write(Data("\n".utf8))
    }
    exit(exitCode)
}

guard pid > 0 else {
    emit(Output(ok: false, state: "FAILED", pickers: [], method: method, error: "FILE_PICKER_TARGET_PID_UNAVAILABLE", detail: "positive application pid required"), exitCode: 1)
}

let application = AXUIElementCreateApplication(pid)
let windows = elements(application, kAXWindowsAttribute as CFString)
var sheets: [AXUIElement] = []
for window in windows { collect(window, predicate: isOpenPanel, into: &sheets) }
var pickers: [PickerObservation] = []
for sheet in sheets {
    if let observed = observePicker(sheet) { pickers.append(observed) }
}
emit(Output(ok: true, state: "OBSERVED", pickers: pickers, method: method, error: nil, detail: nil), exitCode: 0)
