import ApplicationServices
import Carbon.HIToolbox
import CoreGraphics
import Foundation

private struct Request: Decodable {
    let key: String
    let modifiers: [String]
}

private func emit(_ value: [String: Any], exitCode: Int32) -> Never {
    let data = try! JSONSerialization.data(withJSONObject: value, options: [.sortedKeys])
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data([0x0a]))
    exit(exitCode)
}

private func blocked(_ code: String) -> Never {
    emit(["ok": false, "state": "BLOCKED", "error": code], exitCode: 2)
}

private func failed(_ code: String) -> Never {
    emit(["ok": false, "state": "FAILED", "error": code], exitCode: 1)
}

private func keyboardEvent(_ key: Int, down: Bool, flags: CGEventFlags = []) -> CGEvent? {
    guard let event = CGEvent(keyboardEventSource: nil, virtualKey: CGKeyCode(key), keyDown: down) else { return nil }
    event.flags = flags
    return event
}

@main
struct MacOSKeyboardHelper {
    static func main() {
        guard AXIsProcessTrusted() else { blocked("ACCESSIBILITY_NOT_TRUSTED") }
        let input = FileHandle.standardInput.readDataToEndOfFile()
        guard !input.isEmpty else { failed("KEYBOARD_REQUEST_MISSING") }
        let request: Request
        do { request = try JSONDecoder().decode(Request.self, from: input) }
        catch { failed("KEYBOARD_REQUEST_INVALID") }

        let modifiers = request.modifiers
        let plainA = request.key == "a" && modifiers.isEmpty
        let shiftedA = request.key == "a" && modifiers == ["shift"]
        let enter = request.key == "enter" && modifiers.isEmpty
        guard plainA || shiftedA || enter else { failed("KEYBOARD_COMBINATION_UNSUPPORTED") }

        let keyCode = request.key == "enter" ? kVK_Return : kVK_ANSI_A
        let keyFlags: CGEventFlags = shiftedA ? .maskShift : []

        guard
            let keyDown = keyboardEvent(keyCode, down: true, flags: keyFlags),
            let keyUp = keyboardEvent(keyCode, down: false, flags: keyFlags)
        else { failed("KEYBOARD_EVENT_CONSTRUCTION_FAILED") }

        var shiftDown: CGEvent? = nil
        var shiftUp: CGEvent? = nil
        if shiftedA {
            shiftDown = keyboardEvent(kVK_Shift, down: true, flags: .maskShift)
            shiftUp = keyboardEvent(kVK_Shift, down: false)
            guard shiftDown != nil, shiftUp != nil else { failed("KEYBOARD_MODIFIER_EVENT_CONSTRUCTION_FAILED") }
        }

        if shiftedA { shiftDown!.post(tap: .cghidEventTap) }
        keyDown.post(tap: .cghidEventTap)
        keyUp.post(tap: .cghidEventTap)
        if shiftedA { shiftUp!.post(tap: .cghidEventTap) }

        emit([
            "ok": true,
            "state": "KEY_POSTED",
            "key": request.key,
            "modifiers": modifiers,
            "keyLifecycle": "POSTED",
            "modifierLifecycle": shiftedA ? "POSTED" : "NOT_REQUIRED",
            "emergencyModifierReleasePosted": false,
            "semanticConsequenceVerified": false,
            "method": "quartz-canonical-keyboard-press-post"
        ], exitCode: 0)
    }
}
