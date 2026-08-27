import AppKit
import ApplicationServices
import Foundation

struct MenuExtraItem: Codable {
    let title: String?
    let description: String?
    let value: String?
    let enabled: Bool?
}

struct Output: Codable {
    let ok: Bool
    let state: String
    let method: String
    let menuExtrasPresent: Bool
    let items: [MenuExtraItem]
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

func item(_ element: AXUIElement) -> MenuExtraItem? {
    guard stringAttribute(element, kAXRoleAttribute as CFString) == "AXMenuBarItem",
          stringAttribute(element, kAXSubroleAttribute as CFString) == "AXMenuExtra" else { return nil }
    let rawTitle = stringAttribute(element, kAXTitleAttribute as CFString)
    let rawDescription = stringAttribute(element, kAXDescriptionAttribute as CFString)
    let rawValue = stringAttribute(element, kAXValueAttribute as CFString)
    return MenuExtraItem(
        title: rawTitle?.isEmpty == false ? rawTitle : nil,
        description: rawDescription?.isEmpty == false ? rawDescription : nil,
        value: rawValue?.isEmpty == false ? rawValue : nil,
        enabled: boolAttribute(element, kAXEnabledAttribute as CFString)
    )
}

let owners = ["com.apple.systemuiserver", "com.apple.controlcenter"]
let method = "macos-os-owned-native-AX-menu-extras-observation"
var observedBars = 0
var observedItems: [MenuExtraItem] = []

for bundleIdentifier in owners {
    let running = NSRunningApplication.runningApplications(withBundleIdentifier: bundleIdentifier)
    if running.count > 1 {
        let output = Output(ok: false, state: "FAILED", method: method, menuExtrasPresent: observedBars > 0, items: [], error: "MENU_EXTRAS_OWNER_AMBIGUOUS", detail: "expected at most one running process for backend-private menu-extra owner \(bundleIdentifier); observed \(running.count)")
        let data = try JSONEncoder().encode(output)
        FileHandle.standardOutput.write(data)
        FileHandle.standardOutput.write(Data("\n".utf8))
        exit(2)
    }
    guard let instance = running.first else { continue }
    let app = AXUIElementCreateApplication(instance.processIdentifier)
    guard let rawBar = copyAttribute(app, kAXExtrasMenuBarAttribute as CFString) else { continue }
    let bar = rawBar as! AXUIElement
    observedBars += 1
    for child in children(bar) {
        if let value = item(child) { observedItems.append(value) }
    }
}

let output = Output(ok: true, state: "OBSERVED", method: method, menuExtrasPresent: observedBars > 0, items: observedItems, error: nil, detail: nil)
let encoder = JSONEncoder()
encoder.outputFormatting = [.sortedKeys]
let data = try encoder.encode(output)
FileHandle.standardOutput.write(data)
FileHandle.standardOutput.write(Data("\n".utf8))
