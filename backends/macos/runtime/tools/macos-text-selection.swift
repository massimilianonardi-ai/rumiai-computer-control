import Foundation
import ApplicationServices

struct CanonicalRange: Codable {
    let start: Int
    let end: Int
    let length: Int
    let collapsed: Bool
    let unit: String
}

struct Observation: Codable {
    let ok: Bool
    let state: String
    let pid: Int32
    let role: String?
    let name: String?
    let range: CanonicalRange?
    let caret: Int?
    let selectedText: String?
    let textLength: Int?
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
    if let string = value as? String { return string }
    return nil
}

func elementName(_ element: AXUIElement) -> String? {
    for attribute in [kAXTitleAttribute, kAXDescriptionAttribute, kAXIdentifierAttribute, kAXHelpAttribute] {
        if let value = stringAttribute(element, attribute as CFString), !value.isEmpty {
            return value
        }
    }
    return nil
}

func canonicalRole(_ element: AXUIElement) -> String {
    let role = stringAttribute(element, kAXRoleAttribute as CFString) ?? ""
    let subrole = stringAttribute(element, kAXSubroleAttribute as CFString) ?? ""
    if subrole == "AXSearchField" { return "search-box" }
    switch role {
    case "AXTextField": return "text-field"
    case "AXTextArea": return "text-area"
    case "AXComboBox": return "combo-box"
    default: return role
    }
}

func children(_ element: AXUIElement) -> [AXUIElement] {
    guard let value = copyAttribute(element, kAXChildrenAttribute as CFString) else { return [] }
    return value as? [AXUIElement] ?? []
}

func resolveTarget(app: AXUIElement, role: String, name: String) -> Result<AXUIElement, String> {
    var queue: [AXUIElement] = [app]
    var matches: [AXUIElement] = []
    var visited = 0
    let maxNodes = 20000

    while !queue.isEmpty && visited < maxNodes {
        let element = queue.removeFirst()
        visited += 1
        let observedRole = canonicalRole(element)
        let observedName = elementName(element) ?? ""
        let roleMatches = role.isEmpty || observedRole == role
        if roleMatches && observedName == name {
            matches.append(element)
            if matches.count > 1 { break }
        }
        queue.append(contentsOf: children(element))
    }

    if matches.count == 1 { return .success(matches[0]) }
    if matches.isEmpty { return .failure("No native AX text element matched role=\(role) name=\(name)") }
    return .failure("Native AX text target is ambiguous for role=\(role) name=\(name)")
}

func selectedRange(_ element: AXUIElement) -> CFRange? {
    guard let raw = copyAttribute(element, kAXSelectedTextRangeAttribute as CFString) else { return nil }
    guard CFGetTypeID(raw) == AXValueGetTypeID() else { return nil }
    let value = raw as! AXValue
    guard AXValueGetType(value) == .cfRange else { return nil }
    var range = CFRange(location: 0, length: 0)
    guard AXValueGetValue(value, .cfRange, &range) else { return nil }
    return range
}

func emit(_ observation: Observation, exitCode: Int32 = 0) -> Never {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    if let data = try? encoder.encode(observation), let text = String(data: data, encoding: .utf8) {
        print(text)
    }
    Foundation.exit(exitCode)
}

guard CommandLine.arguments.count >= 4 else {
    emit(Observation(ok:false,state:"FAILED",pid:0,role:nil,name:nil,range:nil,caret:nil,selectedText:nil,textLength:nil,method:"macos-ax-selected-text-range",error:"INVALID_ARGUMENTS",detail:"usage: helper <pid> <role> <name>"), exitCode: 2)
}

guard AXIsProcessTrusted() else {
    emit(Observation(ok:false,state:"FAILED",pid:0,role:nil,name:nil,range:nil,caret:nil,selectedText:nil,textLength:nil,method:"macos-ax-selected-text-range",error:"ACCESSIBILITY_PERMISSION_REQUIRED",detail:"macOS Accessibility permission is required"), exitCode: 3)
}

guard let parsedPid = Int32(CommandLine.arguments[1]), parsedPid > 0 else {
    emit(Observation(ok:false,state:"FAILED",pid:0,role:nil,name:nil,range:nil,caret:nil,selectedText:nil,textLength:nil,method:"macos-ax-selected-text-range",error:"INVALID_PID",detail:"positive pid required"), exitCode: 2)
}

let requestedRole = CommandLine.arguments[2]
let requestedName = CommandLine.arguments[3]
if requestedName.isEmpty {
    emit(Observation(ok:false,state:"FAILED",pid:parsedPid,role:requestedRole,name:nil,range:nil,caret:nil,selectedText:nil,textLength:nil,method:"macos-ax-selected-text-range",error:"TEXT_TARGET_UNNAMED",detail:"safe native text re-resolution requires an accessible name"), exitCode: 4)
}

let app = AXUIElementCreateApplication(pid_t(parsedPid))
switch resolveTarget(app: app, role: requestedRole, name: requestedName) {
case .failure(let detail):
    emit(Observation(ok:false,state:"FAILED",pid:parsedPid,role:requestedRole,name:requestedName,range:nil,caret:nil,selectedText:nil,textLength:nil,method:"macos-ax-selected-text-range",error:detail.contains("ambiguous") ? "TEXT_TARGET_AMBIGUOUS" : "TEXT_TARGET_STALE",detail:detail), exitCode: 5)
case .success(let element):
    guard let nativeRange = selectedRange(element), nativeRange.location >= 0, nativeRange.length >= 0 else {
        emit(Observation(ok:false,state:"FAILED",pid:parsedPid,role:canonicalRole(element),name:elementName(element),range:nil,caret:nil,selectedText:nil,textLength:nil,method:"macos-ax-selected-text-range",error:"TEXT_SELECTION_UNAVAILABLE",detail:"AXSelectedTextRange is unavailable or not a CFRange"), exitCode: 6)
    }

    let start = nativeRange.location
    let length = nativeRange.length
    let end = start + length
    let range = CanonicalRange(start:start,end:end,length:length,collapsed:length == 0,unit:"utf16-code-unit")
    let selected = stringAttribute(element, kAXSelectedTextAttribute as CFString)
    let fullText = stringAttribute(element, kAXValueAttribute as CFString)
    let textLength = fullText.map { $0.utf16.count }

    if let total = textLength, end > total {
        emit(Observation(ok:false,state:"FAILED",pid:parsedPid,role:canonicalRole(element),name:elementName(element),range:range,caret:nil,selectedText:selected,textLength:total,method:"macos-ax-selected-text-range",error:"TEXT_SELECTION_INVALID",detail:"observed selection exceeds observed UTF-16 text length"), exitCode: 7)
    }

    if let selected = selected, selected.utf16.count != length {
        emit(Observation(ok:false,state:"FAILED",pid:parsedPid,role:canonicalRole(element),name:elementName(element),range:range,caret:nil,selectedText:selected,textLength:textLength,method:"macos-ax-selected-text-range",error:"TEXT_SELECTION_INCONSISTENT",detail:"AXSelectedText UTF-16 length does not match AXSelectedTextRange"), exitCode: 8)
    }

    emit(Observation(ok:true,state:"OBSERVED",pid:parsedPid,role:canonicalRole(element),name:elementName(element),range:range,caret:length == 0 ? start : nil,selectedText:selected,textLength:textLength,method:"macos-ax-selected-text-range",error:nil,detail:nil))
}
