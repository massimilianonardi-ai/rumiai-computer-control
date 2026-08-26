import Foundation
import ApplicationServices
import Darwin

struct CanonicalRange: Codable {
    let start: Int
    let end: Int
    let length: Int
    let collapsed: Bool
    let unit: String
}

struct MutationResult: Codable {
    let ok: Bool
    let state: String
    let pid: Int32
    let role: String?
    let name: String?
    let range: CanonicalRange?
    let textLength: Int?
    let method: String
    let error: String?
    let detail: String?
}

enum TargetResolution {
    case success(AXUIElement)
    case failure(code: String, detail: String)
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

func elementName(_ element: AXUIElement) -> String? {
    for attribute in [kAXTitleAttribute, kAXDescriptionAttribute, kAXIdentifierAttribute, kAXHelpAttribute] {
        if let value = stringAttribute(element, attribute as CFString), !value.isEmpty { return value }
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

func resolveTarget(app: AXUIElement, role: String, name: String) -> TargetResolution {
    var queue: [AXUIElement] = [app]
    var matches: [AXUIElement] = []
    var visited = 0
    let maxNodes = 20000
    while !queue.isEmpty && visited < maxNodes {
        let element = queue.removeFirst()
        visited += 1
        let observedRole = canonicalRole(element)
        let observedName = elementName(element) ?? ""
        if observedRole == role && observedName == name {
            matches.append(element)
            if matches.count > 1 { break }
        }
        queue.append(contentsOf: children(element))
    }
    if matches.count == 1 { return .success(matches[0]) }
    if matches.isEmpty { return .failure(code:"TEXT_TARGET_STALE", detail:"No native AX text element matched role=\(role) name=\(name)") }
    return .failure(code:"TEXT_TARGET_AMBIGUOUS", detail:"Native AX text target is ambiguous for role=\(role) name=\(name)")
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

func emit(_ result: MutationResult, exitCode: Int32 = 0) -> Never {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    if let data = try? encoder.encode(result), let text = String(data: data, encoding: .utf8) { print(text) }
    Darwin.exit(exitCode)
}

guard CommandLine.arguments.count == 6 else {
    emit(MutationResult(ok:false,state:"FAILED",pid:0,role:nil,name:nil,range:nil,textLength:nil,method:"macos-ax-set-selected-text-range",error:"INVALID_ARGUMENTS",detail:"usage: helper <pid> <role> <name> <start> <end>"), exitCode:2)
}
guard AXIsProcessTrusted() else {
    emit(MutationResult(ok:false,state:"FAILED",pid:0,role:nil,name:nil,range:nil,textLength:nil,method:"macos-ax-set-selected-text-range",error:"ACCESSIBILITY_PERMISSION_REQUIRED",detail:"macOS Accessibility permission is required"), exitCode:3)
}
guard let pid = Int32(CommandLine.arguments[1]), pid > 0 else {
    emit(MutationResult(ok:false,state:"FAILED",pid:0,role:nil,name:nil,range:nil,textLength:nil,method:"macos-ax-set-selected-text-range",error:"INVALID_PID",detail:"positive pid required"), exitCode:2)
}
let role = CommandLine.arguments[2]
let name = CommandLine.arguments[3]
guard !role.isEmpty, !name.isEmpty else {
    emit(MutationResult(ok:false,state:"FAILED",pid:pid,role:role.isEmpty ? nil : role,name:name.isEmpty ? nil : name,range:nil,textLength:nil,method:"macos-ax-set-selected-text-range",error:"INVALID_TEXT_TARGET",detail:"role and accessible name are required"), exitCode:2)
}
guard let start = Int(CommandLine.arguments[4]), let end = Int(CommandLine.arguments[5]), start >= 0, end >= start else {
    emit(MutationResult(ok:false,state:"FAILED",pid:pid,role:role,name:name,range:nil,textLength:nil,method:"macos-ax-set-selected-text-range",error:"INVALID_TEXT_RANGE",detail:"range requires 0 <= start <= end"), exitCode:2)
}

let app = AXUIElementCreateApplication(pid_t(pid))
switch resolveTarget(app: app, role: role, name: name) {
case .failure(let code, let detail):
    emit(MutationResult(ok:false,state:"FAILED",pid:pid,role:role,name:name,range:nil,textLength:nil,method:"macos-ax-set-selected-text-range",error:code,detail:detail), exitCode:5)
case .success(let element):
    guard let fullText = stringAttribute(element, kAXValueAttribute as CFString) else {
        emit(MutationResult(ok:false,state:"FAILED",pid:pid,role:canonicalRole(element),name:elementName(element),range:nil,textLength:nil,method:"macos-ax-set-selected-text-range",error:"TEXT_LENGTH_UNAVAILABLE",detail:"AXValue is required to validate UTF-16 range bounds before mutation"), exitCode:6)
    }
    let textLength = fullText.utf16.count
    guard end <= textLength else {
        emit(MutationResult(ok:false,state:"FAILED",pid:pid,role:canonicalRole(element),name:elementName(element),range:nil,textLength:textLength,method:"macos-ax-set-selected-text-range",error:"TEXT_RANGE_OUT_OF_BOUNDS",detail:"requested end exceeds observed UTF-16 text length"), exitCode:7)
    }
    var settable = DarwinBoolean(false)
    let settableError = AXUIElementIsAttributeSettable(element, kAXSelectedTextRangeAttribute as CFString, &settable)
    guard settableError == .success, settable.boolValue else {
        emit(MutationResult(ok:false,state:"FAILED",pid:pid,role:canonicalRole(element),name:elementName(element),range:nil,textLength:textLength,method:"macos-ax-set-selected-text-range",error:"TEXT_SELECTION_NOT_SETTABLE",detail:"AXSelectedTextRange is not settable on the native target"), exitCode:8)
    }
    var native = CFRange(location:start, length:end-start)
    guard let value = AXValueCreate(.cfRange, &native) else {
        emit(MutationResult(ok:false,state:"FAILED",pid:pid,role:canonicalRole(element),name:elementName(element),range:nil,textLength:textLength,method:"macos-ax-set-selected-text-range",error:"TEXT_RANGE_ENCODING_FAILED",detail:"could not encode CFRange for AXSelectedTextRange"), exitCode:9)
    }
    let writeError = AXUIElementSetAttributeValue(element, kAXSelectedTextRangeAttribute as CFString, value)
    guard writeError == .success else {
        emit(MutationResult(ok:false,state:"FAILED",pid:pid,role:canonicalRole(element),name:elementName(element),range:nil,textLength:textLength,method:"macos-ax-set-selected-text-range",error:"TEXT_RANGE_WRITE_FAILED",detail:"AXSelectedTextRange write failed with AXError \(writeError.rawValue)"), exitCode:10)
    }
    guard let observed = selectedRange(element), observed.location == start, observed.length == end-start else {
        emit(MutationResult(ok:false,state:"UNVERIFIED",pid:pid,role:canonicalRole(element),name:elementName(element),range:nil,textLength:textLength,method:"macos-ax-set-selected-text-range",error:"TEXT_RANGE_WRITE_UNVERIFIED",detail:"native AX range did not equal the request immediately after write"), exitCode:11)
    }
    let canonical = CanonicalRange(start:start,end:end,length:end-start,collapsed:start == end,unit:"utf16-code-unit")
    emit(MutationResult(ok:true,state:"MUTATED",pid:pid,role:canonicalRole(element),name:elementName(element),range:canonical,textLength:textLength,method:"macos-ax-set-selected-text-range",error:nil,detail:nil))
}
