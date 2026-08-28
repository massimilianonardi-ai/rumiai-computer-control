import AppKit
import CoreGraphics
import Foundation

func number(_ value: CGFloat) -> Double {
    return Double(value)
}

func rectObject(_ rect: NSRect) -> [String: Any] {
    return [
        "x": number(rect.origin.x),
        "y": number(rect.origin.y),
        "width": number(rect.size.width),
        "height": number(rect.size.height)
    ]
}

let mainDisplayID: CGDirectDisplayID? = {
    guard let screen = NSScreen.main,
          let number = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber else {
        return nil
    }
    return CGDirectDisplayID(number.uint32Value)
}()

var displays: [[String: Any]] = []

for screen in NSScreen.screens {
    guard let screenNumber = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber else {
        continue
    }

    let displayID = CGDirectDisplayID(screenNumber.uint32Value)
    let rotation = CGDisplayRotation(displayID)

    displays.append([
        "displayID": Int(displayID),
        "name": screen.localizedName,
        "frame": rectObject(screen.frame),
        "visibleFrame": rectObject(screen.visibleFrame),
        "backingScaleFactor": Double(screen.backingScaleFactor),
        "rotationDegrees": Double(rotation),
        "main": mainDisplayID == displayID,
        "builtin": CGDisplayIsBuiltin(displayID) != 0,
        "active": CGDisplayIsActive(displayID) != 0,
        "online": CGDisplayIsOnline(displayID) != 0
    ])
}

let output: [String: Any] = [
    "ok": true,
    "state": "OBSERVED",
    "method": "macos-native-display-observation",
    "displays": displays
]

let data = try JSONSerialization.data(withJSONObject: output, options: [.sortedKeys])
FileHandle.standardOutput.write(data)
FileHandle.standardOutput.write(Data([0x0A]))
