import ApplicationServices
import CoreGraphics
import Foundation

private struct Request: Decodable {
    let operation: String
    let display: String
    let x: Double
    let y: Double
    let destinationX: Double?
    let destinationY: Double?
    let button: String?
    let direction: String?
    let amount: Int?
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

private func pointInside(_ point: CGPoint, bounds: CGRect) -> Bool {
    point.x >= bounds.minX && point.y >= bounds.minY && point.x < bounds.maxX && point.y < bounds.maxY
}

private func globalPoint(x: Double, y: Double, bounds: CGRect) -> CGPoint {
    CGPoint(x: bounds.origin.x + x, y: bounds.origin.y + y)
}

private func postEmergencyLeftUp(at point: CGPoint) -> Bool {
    guard let up = CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp, mouseCursorPosition: point, mouseButton: .left) else {
        return false
    }
    up.post(tap: .cghidEventTap)
    usleep(20_000)
    return true
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

        let bounds = CGDisplayBounds(CGMainDisplayID())
        guard bounds.width > 0, bounds.height > 0 else {
            failed("POINTER_PRIMARY_DISPLAY_UNAVAILABLE", "Primary display bounds are unavailable")
        }
        let target = globalPoint(x: request.x, y: request.y, bounds: bounds)
        guard pointInside(target, bounds: bounds) else {
            failed("POINTER_COORDINATE_OUT_OF_BOUNDS", "Pointer coordinates must lie inside the current primary display")
        }

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

        if request.operation == "wheel" {
            guard let direction = request.direction, direction == "up" || direction == "down" else {
                failed("POINTER_WHEEL_DIRECTION_UNSUPPORTED", "Pointer wheel supports only direction=up or direction=down")
            }
            guard let amount = request.amount, amount >= 1, amount <= 10 else {
                failed("POINTER_WHEEL_AMOUNT_INVALID", "Pointer wheel amount must be an integer from 1 through 10")
            }

            // Physical Phase 10D discovery established the reference-surface mapping:
            // positive wheel1 -> decreasing document y, negative wheel1 -> increasing document y.
            // Keep the Quartz sign private and expose only canonical up/down direction.
            let nativeDelta = Int32(direction == "up" ? amount : -amount)
            guard let wheel = CGEvent(
                scrollWheelEvent2Source: nil,
                units: .line,
                wheelCount: 1,
                wheel1: nativeDelta,
                wheel2: 0,
                wheel3: 0
            ) else {
                failed("POINTER_WHEEL_EVENT_CONSTRUCTION_FAILED", "Could not construct native pointer wheel event")
            }
            wheel.post(tap: .cghidEventTap)
            usleep(30_000)

            emit([
                "ok": true,
                "state": "WHEEL_POSTED",
                "display": "primary",
                "x": positionedLocal.x,
                "y": positionedLocal.y,
                "direction": direction,
                "amount": amount,
                "positionVerified": true,
                "wheelDelivery": "POSTED",
                "semanticConsequenceVerified": false,
                "method": "quartz-primary-display-pointer-wheel-post"
            ], exitCode: 0)
        }

        if request.operation == "drag" {
            guard request.button == "left" else {
                failed("POINTER_BUTTON_UNSUPPORTED", "Pointer drag currently supports only button=left")
            }
            guard let destinationX = request.destinationX, let destinationY = request.destinationY, destinationX.isFinite, destinationY.isFinite else {
                failed("POINTER_DRAG_DESTINATION_INVALID", "Pointer drag requires finite destination coordinates")
            }
            let destination = globalPoint(x: destinationX, y: destinationY, bounds: bounds)
            guard pointInside(destination, bounds: bounds) else {
                failed("POINTER_DRAG_DESTINATION_OUT_OF_BOUNDS", "Pointer drag destination must lie inside the current primary display")
            }

            // Construct the complete lifecycle before posting the button-down event. This
            // prevents construction failures from leaving a held button behind.
            guard let down = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDown, mouseCursorPosition: target, mouseButton: .left) else {
                failed("POINTER_DRAG_DOWN_CONSTRUCTION_FAILED", "Could not construct native drag button-down event")
            }
            var draggedEvents: [CGEvent] = []
            for step in 1...4 {
                let fraction = CGFloat(step) / 4.0
                let point = CGPoint(
                    x: target.x + (destination.x - target.x) * fraction,
                    y: target.y + (destination.y - target.y) * fraction
                )
                guard let dragged = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDragged, mouseCursorPosition: point, mouseButton: .left) else {
                    failed("POINTER_DRAG_EVENT_CONSTRUCTION_FAILED", "Could not construct native drag movement event")
                }
                draggedEvents.append(dragged)
            }
            guard let up = CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp, mouseCursorPosition: destination, mouseButton: .left) else {
                failed("POINTER_DRAG_UP_CONSTRUCTION_FAILED", "Could not construct native drag button-up event")
            }

            var buttonMayBeDown = false
            down.post(tap: .cghidEventTap)
            buttonMayBeDown = true
            usleep(20_000)
            for dragged in draggedEvents {
                dragged.post(tap: .cghidEventTap)
                usleep(20_000)
            }
            up.post(tap: .cghidEventTap)
            buttonMayBeDown = false
            usleep(30_000)

            // Defensive cleanup path for future changes: current success path posts the
            // complete lifecycle without fallible work after button-down.
            if buttonMayBeDown {
                let releasePoint = CGEvent(source: nil)?.location ?? destination
                guard postEmergencyLeftUp(at: releasePoint) else {
                    failed("POINTER_DRAG_RELEASE_UNVERIFIED", "Could not construct emergency drag release", state: "UNVERIFIED")
                }
                failed("POINTER_DRAG_EMERGENCY_RELEASE_REQUIRED", "Drag required emergency button release", state: "UNVERIFIED")
            }

            let destinationLocal = localPoint(destination, bounds: bounds)
            emit([
                "ok": true,
                "state": "DRAG_POSTED",
                "display": "primary",
                "sourceX": positionedLocal.x,
                "sourceY": positionedLocal.y,
                "destinationX": destinationLocal.x,
                "destinationY": destinationLocal.y,
                "button": "left",
                "sourcePositionVerified": true,
                "buttonLifecycle": "POSTED",
                "dragDelivery": "POSTED",
                "releasePosted": true,
                "emergencyReleasePosted": false,
                "semanticConsequenceVerified": false,
                "method": "quartz-primary-display-pointer-drag-post"
            ], exitCode: 0)
        }

        guard request.operation == "click" else {
            failed("POINTER_OPERATION_UNSUPPORTED", "Pointer helper supports only move, click, drag or wheel")
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

        // The requested coordinate has already been independently re-observed immediately
        // before delivery. A later cursor-location check would conflate button posting with
        // unrelated concurrent pointer motion and is not evidence of button delivery.
        down.post(tap: .cghidEventTap)
        usleep(15_000)
        up.post(tap: .cghidEventTap)
        usleep(30_000)

        emit([
            "ok": true,
            "state": "CLICK_POSTED",
            "display": "primary",
            "x": positionedLocal.x,
            "y": positionedLocal.y,
            "button": button,
            "positionVerified": true,
            "buttonDelivery": "POSTED",
            "semanticConsequenceVerified": false,
            "method": "quartz-primary-display-pointer-click-post"
        ], exitCode: 0)
    }
}
