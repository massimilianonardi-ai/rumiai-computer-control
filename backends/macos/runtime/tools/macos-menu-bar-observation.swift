import Foundation
import ApplicationServices

struct MenuItemObservation: Encodable {
    let title: String
    let enabled: Bool?
    let children: [MenuItemObservation]
}

struct Output: Encodable {
    let ok: Bool
    let state: String?
    let error: String?
    let detail: String?
    let method: String
    let menuBarPresent: Bool
    let items: [MenuItemObservation]
}

func copyAttribute(_ element: AXUIElement, _ attribute: CFString) -> CFTypeRef? {
    var value: CFTypeRef?
    let result = AXUIElementCopyAttributeValue(element, attribute, &value)
    return result == .success ? value : nil
}

func stringAttribute(_ element: AXUIElement, _ attribute: CFString) -> String? {
    copyAttribute(element, attribute) as? String
}

func boolAttribute(_ element: AXUIElement, _ attribute: CFString) -> Bool? {
    if let number = copyAttribute(element, attribute) as? NSNumber { return number.boolValue }
    return nil
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

func children(_ element: AXUIElement) -> [AXUIElement] {
    guard let values = copyAttribute(element, kAXChildrenAttribute as CFString) as? [AXUIElement] else { return [] }
    return values
}

var visitedCount = 0
let maxNodes = 2000
let maxDepth = 10

func menuChildren(_ menu: AXUIElement, depth: Int) -> [MenuItemObservation] {
    guard depth <= maxDepth else { return [] }
    var result: [MenuItemObservation] = []
    for child in children(menu) {
        if visitedCount >= maxNodes { break }
        let childRole = role(child)
        guard childRole == (kAXMenuItemRole as String) || childRole == (kAXMenuBarItemRole as String) else { continue }
        guard let childTitle = title(child), !childTitle.isEmpty else { continue }
        visitedCount += 1
        let submenus = children(child).filter { role($0) == (kAXMenuRole as String) }
        let nested = submenus.flatMap { menuChildren($0, depth: depth + 1) }
        result.append(MenuItemObservation(
            title: childTitle,
            enabled: boolAttribute(child, kAXEnabledAttribute as CFString),
            children: nested
        ))
    }
    return result
}

func topLevelItems(_ menuBar: AXUIElement) -> [MenuItemObservation] {
    var result: [MenuItemObservation] = []
    for child in children(menuBar) {
        if visitedCount >= maxNodes { break }
        guard role(child) == (kAXMenuBarItemRole as String) else { continue }
        guard let childTitle = title(child), !childTitle.isEmpty else { continue }
        visitedCount += 1
        let menus = children(child).filter { role($0) == (kAXMenuRole as String) }
        let nested = menus.flatMap { menuChildren($0, depth: 1) }
        result.append(MenuItemObservation(
            title: childTitle,
            enabled: boolAttribute(child, kAXEnabledAttribute as CFString),
            children: nested
        ))
    }
    return result
}

let method = "macos-provider-scoped-native-AX-menu-bar-observation"
let encoder = JSONEncoder()

func emit(_ output: Output, exitCode: Int32 = 0) -> Never {
    if let data = try? encoder.encode(output), let text = String(data: data, encoding: .utf8) {
        print(text)
    }
    exit(exitCode)
}

guard CommandLine.arguments.count == 2, let pid = pid_t(CommandLine.arguments[1]) else {
    emit(Output(ok: false, state: "FAILED", error: "MENU_BAR_INVALID_PID", detail: "Expected one numeric PID", method: method, menuBarPresent: false, items: []), exitCode: 1)
}

let app = AXUIElementCreateApplication(pid)
guard let menuBar = copyAttribute(app, kAXMenuBarAttribute as CFString) as! AXUIElement? else {
    emit(Output(ok: true, state: "OBSERVED", error: nil, detail: nil, method: method, menuBarPresent: false, items: []))
}

guard role(menuBar) == (kAXMenuBarRole as String) else {
    emit(Output(ok: false, state: "FAILED", error: "MENU_BAR_ROLE_UNSUPPORTED", detail: "kAXMenuBarAttribute did not resolve to AXMenuBar", method: method, menuBarPresent: true, items: []), exitCode: 1)
}

let items = topLevelItems(menuBar)
emit(Output(ok: true, state: "OBSERVED", error: nil, detail: nil, method: method, menuBarPresent: true, items: items))
