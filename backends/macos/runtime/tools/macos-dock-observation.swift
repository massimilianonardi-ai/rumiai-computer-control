import AppKit
import ApplicationServices
import Foundation

struct DockItem: Codable {
    let kind: String
    let title: String?
    let running: Bool?
    let status: String?
}

struct Output: Codable {
    let ok: Bool
    let state: String
    let method: String
    let dockPresent: Bool
    let items: [DockItem]
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
    return nil
}

func boolAttribute(_ element: AXUIElement, _ attribute: CFString) -> Bool? {
    guard let raw = copyAttribute(element, attribute) else { return nil }
    if CFGetTypeID(raw) == CFBooleanGetTypeID() { return CFBooleanGetValue(raw as! CFBoolean) }
    if let number = raw as? NSNumber { return number.boolValue }
    return nil
}

func children(_ element: AXUIElement) -> [AXUIElement] {
    guard let raw = copyAttribute(element, kAXChildrenAttribute as CFString) else { return [] }
    return raw as? [AXUIElement] ?? []
}

func canonicalKind(_ subrole: String?) -> String {
    switch subrole {
    case "AXApplicationDockItem": return "application"
    case "AXFolderDockItem": return "folder"
    case "AXTrashDockItem": return "trash"
    case "AXSeparatorDockItem": return "separator"
    default: return "other"
    }
}

func collectDockItems(_ root: AXUIElement, maxDepth: Int = 4, maxNodes: Int = 512) -> [DockItem] {
    var result: [DockItem] = []
    var visited = 0

    func visit(_ element: AXUIElement, depth: Int) {
        if depth > maxDepth || visited >= maxNodes { return }
        visited += 1
        let role = stringAttribute(element, kAXRoleAttribute as CFString)
        if role == "AXDockItem" {
            let subrole = stringAttribute(element, kAXSubroleAttribute as CFString)
            let rawTitle = stringAttribute(element, kAXTitleAttribute as CFString)
            let title = rawTitle?.isEmpty == false ? rawTitle : nil
            result.append(DockItem(
                kind: canonicalKind(subrole),
                title: title,
                running: boolAttribute(element, "AXIsApplicationRunning" as CFString),
                status: stringAttribute(element, "AXStatusLabel" as CFString)
            ))
            return
        }
        for child in children(element) { visit(child, depth: depth + 1) }
    }

    visit(root, depth: 0)
    return result
}

let method = "macos-os-owned-native-AX-dock-observation"
let running = NSRunningApplication.runningApplications(withBundleIdentifier: "com.apple.dock")

if running.count > 1 {
    let output = Output(ok: false, state: "FAILED", method: method, dockPresent: true, items: [], error: "DOCK_PROCESS_AMBIGUOUS", detail: "expected at most one running Dock process; observed \(running.count)")
    let data = try JSONEncoder().encode(output)
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data("\n".utf8))
    exit(2)
}

if let instance = running.first {
    let app = AXUIElementCreateApplication(instance.processIdentifier)
    let output = Output(ok: true, state: "OBSERVED", method: method, dockPresent: true, items: collectDockItems(app), error: nil, detail: nil)
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    let data = try encoder.encode(output)
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data("\n".utf8))
} else {
    let output = Output(ok: true, state: "OBSERVED", method: method, dockPresent: false, items: [], error: nil, detail: nil)
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    let data = try encoder.encode(output)
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data("\n".utf8))
}
