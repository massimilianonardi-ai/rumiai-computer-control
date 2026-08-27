import Foundation
import ApplicationServices

struct MenuItemObservation: Encodable {
    let title: String
    let enabled: Bool?
    let children: [MenuItemObservation]
}

struct Output: Encodable {
    let ok: Bool
    let state: String
    let error: String?
    let detail: String?
    let method: String
    let menuBarPresent: Bool
    let items: [MenuItemObservation]
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

func role(_ element: AXUIElement) -> String? {
    stringAttribute(element, kAXRoleAttribute as CFString)
}

func title(_ element: AXUIElement) -> String? {
    let candidates = [
        stringAttribute(element, kAXTitleAttribute as CFString),
        stringAttribute(element, kAXValueAttribute as CFString),
        stringAttribute(element, kAXDescriptionAttribute as CFString),
    ]
    return candidates.compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }.first { !$0.isEmpty }
}

var visitedCount = 0
let maxNodes = 2000
let maxDepth = 10

func menuChildren(_ menu: AXUIElement, depth: Int) -> [MenuItemObservation] {
    guard depth <= maxDepth else { return [] }
    var result: [MenuItemObservation] = []
    for child in elements(menu, kAXChildrenAttribute as CFString) {
        if visitedCount >= maxNodes { break }
        let childRole = role(child)
        guard childRole == (kAXMenuItemRole as String) || childRole == (kAXMenuBarItemRole as String) else { continue }
        guard let childTitle = title(child), !childTitle.isEmpty else { continue }
        visitedCount += 1
        let submenus = elements(child, kAXChildrenAttribute as CFString).filter { role($0) == (kAXMenuRole as String) }
        let nested = submenus.flatMap { menuChildren($0, depth: depth + 1) }
        result.append(MenuItemObservation(title: childTitle, enabled: boolAttribute(child, kAXEnabledAttribute as CFString), children: nested))
    }
    return result
}

func topLevelItems(_ menuBar: AXUIElement) -> [MenuItemObservation] {
    var result: [MenuItemObservation] = []
    for child in elements(menuBar, kAXChildrenAttribute as CFString) {
        if visitedCount >= maxNodes { break }
        guard role(child) == (kAXMenuBarItemRole as String) else { continue }
        guard let childTitle = title(child), !childTitle.isEmpty else { continue }
        visitedCount += 1
        let menus = elements(child, kAXChildrenAttribute as CFString).filter { role($0) == (kAXMenuRole as String) }
        let nested = menus.flatMap { menuChildren($0, depth: 1) }
        result.append(MenuItemObservation(title: childTitle, enabled: boolAttribute(child, kAXEnabledAttribute as CFString), children: nested))
    }
    return result
}

let pid: pid_t = CommandLine.arguments.count > 1 ? pid_t(CommandLine.arguments[1]) ?? 0 : 0
let method = "macos-provider-scoped-native-AX-menu-bar-observation"
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
    emit(Output(ok: false, state: "FAILED", error: "MENU_BAR_TARGET_PID_UNAVAILABLE", detail: "positive application pid required", method: method, menuBarPresent: false, items: []), exitCode: 1)
}

let application = AXUIElementCreateApplication(pid)
guard let rawMenuBar = copyAttribute(application, kAXMenuBarAttribute as CFString) else {
    emit(Output(ok: true, state: "OBSERVED", error: nil, detail: nil, method: method, menuBarPresent: false, items: []), exitCode: 0)
}
guard CFGetTypeID(rawMenuBar) == AXUIElementGetTypeID() else {
    emit(Output(ok: false, state: "FAILED", error: "MENU_BAR_ROLE_UNSUPPORTED", detail: "kAXMenuBarAttribute did not resolve to an Accessibility element", method: method, menuBarPresent: true, items: []), exitCode: 1)
}
let menuBar = unsafeBitCast(rawMenuBar, to: AXUIElement.self)
guard role(menuBar) == (kAXMenuBarRole as String) else {
    emit(Output(ok: false, state: "FAILED", error: "MENU_BAR_ROLE_UNSUPPORTED", detail: "kAXMenuBarAttribute did not resolve to AXMenuBar", method: method, menuBarPresent: true, items: []), exitCode: 1)
}

emit(Output(ok: true, state: "OBSERVED", error: nil, detail: nil, method: method, menuBarPresent: true, items: topLevelItems(menuBar)), exitCode: 0)
