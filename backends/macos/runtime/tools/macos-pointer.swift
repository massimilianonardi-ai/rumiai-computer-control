import ApplicationServices
import CoreGraphics
import Foundation

private struct Request: Decodable {
    let operation: String
    let display: String
    let x: Double
    let y: Double
    let button: String?
}

private func emit(_ value: [String: Any], exitCode: Int32) -> Never {
    let data = try! JSONSerialization.data(withJSONObject: value, options: [.sortedKeys])
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data([0x0a]))
    exit(exitCode)
}

private func blocked(_ code: String, _ detail: String) -> Never {
    emit(["ok": false, "state": "BLOCKED", "error": code, "detail": detail], exitCode: 2)
}

private func failed(_ code: String, _ detail: String, state: String = "FAILED") -> Never {
    emit(["ok": false, "state": state, "error": code, "detail": detail], exitCode: 1)
}

private func near(_ a: CGPoint, _ b: CGPoint, tolerance: CGFloat = 1.0) -> Bool {
    abs(a.x - b.x) <= tolerance && abs(a.y - b.y) <= tolerance
}

private func localPoint(_ global: CGPoint, bounds: CGRect) -> CGPoint {
    CGPoint(x: global.x - bounds.origin.x, y: global.y - bounds.origin.y)
}

@main
struct MacOSPointerHelper {
    static func main() {
        guard AXIsProcessTrusted() else {
            blocked("ACCESSIBILITY_NOT_TRUSTED", "Pointer fallback requires macOS Accessibility permission")
        }
        let input = FileHandle.standardInput.readDataToEndOfFile()
        guard !input.isEmpty, let request = try? JSONDecoder().decode(Request.self, from: input) else {
            failed("POINTER_REQUEST_INVALID", "Pointer helper requires a valid JSON request")
        }
        guard request.display == "primary" else {
            failed("POINTER_DISPLAY_UNSUPPORTED", "Pointer helper currently supports only display=primary")
        }
        guard request.x.isFinite, request.y.isFinite else {
            failed("POINTER_COORDINATE_INVALID", "Pointer coordinates must be finite numbers")
        }

        let displayID = CGMainDisplayID()
        let bounds = CGDisplayBounds(displayID)
        guard bounds.width > 0, bounds.height > 0 else {
            failed("POINTER_PRIMARY_DISPLAY_UNAVAILABLE", "Primary display bounds are unavailable")
        }
        guard request.x >= 0, request.y >= 0, request.x < bounds.width, request.y < bounds.height else {
            failed("POINTER_COORDINATE_OUT_OF_BOUNDS", "Pointer coordinates must lie inside the current primary display")
        }

        let target = CGPoint(x: bounds.origin.x + request.x, y: bounds.origin.y + request.y)
        guard let initialEvent = CGEvent(source: nil) else {
            failed("POINTER_LOCATION_UNAVAILABLE", "Current pointer location could not be observed")
        }
        let initial = initialEvent.location
        let alreadyAtTarget = near(initial, target)

        if !alreadyAtTarget {
            guard let move = CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: target, mouseButton: .left) else {
                failed("POINTER_MOVE_EVENT_CONSTRUCTION_FAILED", "Could not construct native pointer move event")
            }
            move.post(tap: .cghidEventTap)
            usleep(50_000)
        }

        guard let positionedEvent = CGEvent(source: nil), near(positionedEvent.location, target) else {
            failed("POINTER_POSITION_UNVERIFIED", "Requested pointer position was not independently re-observed", state: "UNVERIFIED")
        }
        let positionedLocal = localPoint(positionedEvent.location, bounds: bounds)

        if request.operation == "move" {
            emit([
                "ok": true,
                "state": "MOVED",
                "display": "primary",
                "x": positionedLocal.x,
                "y": positionedLocal.y,
                "changed": !alreadyAtTarget,
                "idempotent": alreadyAtTarget,
                "positionVerified": true,
                "method": "quartz-primary-display-pointer-move"
            ], exitCode: 0)
        }

        guard request.operation == "click" else {
            failed("POINTER_OPERATION_UNSUPPORTED", "Pointer helper supports only move or click")
        }
        guard let button = request.button, button == "left" || button == "right" else {
            failed("POINTER_BUTTON_UNSUPPORTED", "Pointer click supports only left or right button")
        }

        let downType: CGEventType = button == "left" ? .leftMouseDown : .rightMouseDown
        let upType: CGEventType = button == "left" ? .leftMouseUp : .rightMouseUp
        let nativeButton: CGMouseButton = button == "left" ? .left : .right
        guard
            let down = CGEvent(mouseEventSource: nil, mouseType: downType, mouseCursorPosition: target, mouseButton: nativeButton),
            let up = CGEvent(mouseEventSource: nil, mouseType: upType, mouseCursorPosition: target, mouseButton: nativeButton)
        else {
            failed("POINTER_BUTTON_EVENT_CONSTRUCTION_FAILED", "Could not construct native pointer button events")
        }

        down.post(tap: .cghidEventTap)
        usleep(15_000)
        up.post(tap: .cghidEventTap)
        usleep(30_000)

        guard let finalEvent = CGEvent(source: nil), near(finalEvent.location, target) else {
            failed("POINTER_CLICK_POSITION_UNVERIFIED", "Pointer moved away from requested click coordinate during delivery", state: "UNVERIFIED")
        }
        let finalLocal = localPoint(finalEvent.location, bounds: bounds)
        emit([
            "ok": true,
            "state": "CLICK_POSTED",
            "display": "primary",
            "x": finalLocal.x,
            "y": finalLocal.y,
            "button": button,
            "positionVerified": true,
            "buttonDelivery": "POSTED",
            "semanticConsequenceVerified": false,
            "method": "quartz-primary-display-pointer-click-post"
        ], exitCode: 0)
    }
}
