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
    let replacementLength: Int?
    let beforeTextLength: Int?
    let afterTextLength: Int?
    let verifiedText: Bool
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

func splitsSurrogatePair(_ text: String, at offset: Int) -> Bool {
    let units = Array(text.utf16)
    guard offset > 0, offset < units.count else { return false }
    let previous = units[offset - 1]
    let next = units[offset]
    let previousIsHigh = previous >= 0xD800 && previous <= 0xDBFF
    let nextIsLow = next >= 0xDC00 && next <= 0xDFFF
    return previousIsHigh && nextIsLow
}

func expectedText(_ original: String, start: Int, end: Int, replacement: String) -> String? {
    guard !splitsSurrogatePair(original, at: start), !splitsSurrogatePair(original, at: end) else { return nil }
    let ns = original as NSString
    guard start >= 0, end >= start, end <= ns.length else { return nil }
    let prefix = ns.substring(with: NSRange(location: 0, length: start))
    let suffix = ns.substring(from: end)
    return prefix + replacement + suffix
}

func emit(_ result: MutationResult, exitCode: Int32 = 0) -> Never {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    if let data = try? encoder.encode(result), let text = String(data: data, encoding: .utf8) { print(text) }
    Darwin.exit(exitCode)
}

let method = "macos-ax-selected-text-range-mutation"

guard CommandLine.arguments.count == 7 else {
    emit(MutationResult(ok:false,state:"FAILED",pid:0,role:nil,name:nil,range:nil,replacementLength:nil,beforeTextLength:nil,afterTextLength:nil,verifiedText:false,method:method,error:"INVALID_ARGUMENTS",detail:"usage: helper <pid> <role> <name> <start> <end> <replacement-base64>"), exitCode:2)
}
guard AXIsProcessTrusted() else {
    emit(MutationResult(ok:false,state:"FAILED",pid:0,role:nil,name:nil,range:nil,replacementLength:nil,beforeTextLength:nil,afterTextLength:nil,verifiedText:false,method:method,error:"ACCESSIBILITY_PERMISSION_REQUIRED",detail:"macOS Accessibility permission is required"), exitCode:3)
}
guard let pid = Int32(CommandLine.arguments[1]), pid > 0 else {
    emit(MutationResult(ok:false,state:"FAILED",pid:0,role:nil,name:nil,range:nil,replacementLength:nil,beforeTextLength:nil,afterTextLength:nil,verifiedText:false,method:method,error:"INVALID_PID",detail:"positive pid required"), exitCode:2)
}
let role = CommandLine.arguments[2]
let name = CommandLine.arguments[3]
guard !role.isEmpty, !name.isEmpty else {
    emit(MutationResult(ok:false,state:"FAILED",pid:pid,role:role.isEmpty ? nil : role,name:name.isEmpty ? nil : name,range:nil,replacementLength:nil,beforeTextLength:nil,afterTextLength:nil,verifiedText:false,method:method,error:"INVALID_TEXT_TARGET",detail:"role and accessible name are required"), exitCode:2)
}
guard let start = Int(CommandLine.arguments[4]), let end = Int(CommandLine.arguments[5]), start >= 0, end >= start else {
    emit(MutationResult(ok:false,state:"FAILED",pid:pid,role:role,name:name,range:nil,replacementLength:nil,beforeTextLength:nil,afterTextLength:nil,verifiedText:false,method:method,error:"INVALID_TEXT_RANGE",detail:"range requires 0 <= start <= end"), exitCode:2)
}
guard let replacementData = Data(base64Encoded: CommandLine.arguments[6]), let replacement = String(data: replacementData, encoding: .utf8) else {
    emit(MutationResult(ok:false,state:"FAILED",pid:pid,role:role,name:name,range:nil,replacementLength:nil,beforeTextLength:nil,afterTextLength:nil,verifiedText:false,method:method,error:"INVALID_TEXT_PAYLOAD",detail:"replacement must be valid UTF-8 encoded as base64"), exitCode:2)
}

let app = AXUIElementCreateApplication(pid_t(pid))
switch resolveTarget(app: app, role: role, name: name) {
case .failure(let code, let detail):
    emit(MutationResult(ok:false,state:"FAILED",pid:pid,role:role,name:name,range:nil,replacementLength:replacement.utf16.count,beforeTextLength:nil,afterTextLength:nil,verifiedText:false,method:method,error:code,detail:detail), exitCode:5)
case .success(let element):
    guard let fullText = stringAttribute(element, kAXValueAttribute as CFString) else {
        emit(MutationResult(ok:false,state:"FAILED",pid:pid,role:canonicalRole(element),name:elementName(element),range:nil,replacementLength:replacement.utf16.count,beforeTextLength:nil,afterTextLength:nil,verifiedText:false,method:method,error:"TEXT_VALUE_UNAVAILABLE",detail:"AXValue is required for precise range mutation"), exitCode:6)
    }
    let beforeLength = fullText.utf16.count
    guard end <= beforeLength else {
        emit(MutationResult(ok:false,state:"FAILED",pid:pid,role:canonicalRole(element),name:elementName(element),range:nil,replacementLength:replacement.utf16.count,beforeTextLength:beforeLength,afterTextLength:nil,verifiedText:false,method:method,error:"TEXT_RANGE_OUT_OF_BOUNDS",detail:"requested end exceeds observed UTF-16 text length"), exitCode:7)
    }
    guard !splitsSurrogatePair(fullText, at:start), !splitsSurrogatePair(fullText, at:end) else {
        emit(MutationResult(ok:false,state:"FAILED",pid:pid,role:canonicalRole(element),name:elementName(element),range:nil,replacementLength:replacement.utf16.count,beforeTextLength:beforeLength,afterTextLength:nil,verifiedText:false,method:method,error:"TEXT_RANGE_SPLITS_SURROGATE",detail:"range boundary must not split a UTF-16 surrogate pair"), exitCode:8)
    }
    guard let expected = expectedText(fullText, start:start, end:end, replacement:replacement) else {
        emit(MutationResult(ok:false,state:"FAILED",pid:pid,role:canonicalRole(element),name:elementName(element),range:nil,replacementLength:replacement.utf16.count,beforeTextLength:beforeLength,afterTextLength:nil,verifiedText:false,method:method,error:"TEXT_EXPECTATION_FAILED",detail:"could not construct exact expected text"), exitCode:9)
    }

    var rangeSettable = DarwinBoolean(false)
    let rangeSettableError = AXUIElementIsAttributeSettable(element, kAXSelectedTextRangeAttribute as CFString, &rangeSettable)
    guard rangeSettableError == .success, rangeSettable.boolValue else {
        emit(MutationResult(ok:false,state:"FAILED",pid:pid,role:canonicalRole(element),name:elementName(element),range:nil,replacementLength:replacement.utf16.count,beforeTextLength:beforeLength,afterTextLength:nil,verifiedText:false,method:method,error:"TEXT_SELECTION_NOT_SETTABLE",detail:"AXSelectedTextRange is not settable on the native target"), exitCode:10)
    }
    var textSettable = DarwinBoolean(false)
    let textSettableError = AXUIElementIsAttributeSettable(element, kAXSelectedTextAttribute as CFString, &textSettable)
    guard textSettableError == .success, textSettable.boolValue else {
        emit(MutationResult(ok:false,state:"FAILED",pid:pid,role:canonicalRole(element),name:elementName(element),range:nil,replacementLength:replacement.utf16.count,beforeTextLength:beforeLength,afterTextLength:nil,verifiedText:false,method:method,error:"SELECTED_TEXT_NOT_SETTABLE",detail:"AXSelectedText is not settable on the native target"), exitCode:11)
    }

    var nativeRange = CFRange(location:start, length:end-start)
    guard let rangeValue = AXValueCreate(.cfRange, &nativeRange) else {
        emit(MutationResult(ok:false,state:"FAILED",pid:pid,role:canonicalRole(element),name:elementName(element),range:nil,replacementLength:replacement.utf16.count,beforeTextLength:beforeLength,afterTextLength:nil,verifiedText:false,method:method,error:"TEXT_RANGE_ENCODING_FAILED",detail:"could not encode CFRange for AXSelectedTextRange"), exitCode:12)
    }
    let selectError = AXUIElementSetAttributeValue(element, kAXSelectedTextRangeAttribute as CFString, rangeValue)
    guard selectError == .success else {
        emit(MutationResult(ok:false,state:"FAILED",pid:pid,role:canonicalRole(element),name:elementName(element),range:nil,replacementLength:replacement.utf16.count,beforeTextLength:beforeLength,afterTextLength:nil,verifiedText:false,method:method,error:"TEXT_RANGE_WRITE_FAILED",detail:"AXSelectedTextRange write failed with AXError \(selectError.rawValue)"), exitCode:13)
    }
    guard let observedRange = selectedRange(element), observedRange.location == start, observedRange.length == end-start else {
        emit(MutationResult(ok:false,state:"UNVERIFIED",pid:pid,role:canonicalRole(element),name:elementName(element),range:nil,replacementLength:replacement.utf16.count,beforeTextLength:beforeLength,afterTextLength:nil,verifiedText:false,method:method,error:"TEXT_RANGE_WRITE_UNVERIFIED",detail:"native AX range did not equal the request before mutation"), exitCode:14)
    }

    let writeError = AXUIElementSetAttributeValue(element, kAXSelectedTextAttribute as CFString, replacement as CFString)
    guard writeError == .success else {
        emit(MutationResult(ok:false,state:"FAILED",pid:pid,role:canonicalRole(element),name:elementName(element),range:nil,replacementLength:replacement.utf16.count,beforeTextLength:beforeLength,afterTextLength:nil,verifiedText:false,method:method,error:"TEXT_MUTATION_WRITE_FAILED",detail:"AXSelectedText write failed with AXError \(writeError.rawValue)"), exitCode:15)
    }
    guard let afterText = stringAttribute(element, kAXValueAttribute as CFString) else {
        emit(MutationResult(ok:false,state:"UNVERIFIED",pid:pid,role:canonicalRole(element),name:elementName(element),range:nil,replacementLength:replacement.utf16.count,beforeTextLength:beforeLength,afterTextLength:nil,verifiedText:false,method:method,error:"TEXT_MUTATION_UNVERIFIED",detail:"AXValue unavailable after selected-text mutation"), exitCode:16)
    }
    guard afterText == expected else {
        emit(MutationResult(ok:false,state:"UNVERIFIED",pid:pid,role:canonicalRole(element),name:elementName(element),range:nil,replacementLength:replacement.utf16.count,beforeTextLength:beforeLength,afterTextLength:afterText.utf16.count,verifiedText:false,method:method,error:"TEXT_MUTATION_UNVERIFIED",detail:"native full text did not equal the exact expected result"), exitCode:17)
    }

    let canonical = CanonicalRange(start:start,end:end,length:end-start,collapsed:start == end,unit:"utf16-code-unit")
    emit(MutationResult(ok:true,state:"MUTATED",pid:pid,role:canonicalRole(element),name:elementName(element),range:canonical,replacementLength:replacement.utf16.count,beforeTextLength:beforeLength,afterTextLength:afterText.utf16.count,verifiedText:true,method:method,error:nil,detail:nil))
}
