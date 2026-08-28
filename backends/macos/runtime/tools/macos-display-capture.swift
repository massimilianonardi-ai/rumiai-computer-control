import AppKit
import CoreGraphics
import Foundation
import ScreenCaptureKit

private let maximumPNGBytes = 20 * 1024 * 1024

private func emit(_ value: [String: Any], exitCode: Int32) -> Never {
    let data = try! JSONSerialization.data(withJSONObject: value, options: [.sortedKeys])
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data([0x0a]))
    exit(exitCode)
}

private func fail(_ code: String, _ detail: String, state: String = "FAILED") -> Never {
    emit([
        "ok": false,
        "state": state,
        "error": code,
        "detail": detail,
        "method": "macos-screencapturekit-primary-display-png",
    ], exitCode: state == "BLOCKED" ? 2 : 1)
}

@main
struct DisplayCaptureProgram {
    static func main() async {
        guard CGPreflightScreenCaptureAccess() else {
            fail(
                "SCREEN_CAPTURE_PERMISSION_REQUIRED",
                "Screen Recording permission is required; Computer Control does not request it automatically",
                state: "BLOCKED"
            )
        }

        do {
            let mainDisplayID = CGMainDisplayID()
            let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
            guard let display = content.displays.first(where: { $0.displayID == mainDisplayID }) else {
                fail("PRIMARY_DISPLAY_NOT_SHAREABLE", "The current primary display is not available through ScreenCaptureKit")
            }

            let width = Int(CGDisplayPixelsWide(mainDisplayID))
            let height = Int(CGDisplayPixelsHigh(mainDisplayID))
            guard width > 0, height > 0 else {
                fail("DISPLAY_CAPTURE_INVALID_DIMENSIONS", "The primary display reported invalid capture dimensions")
            }

            let filter = SCContentFilter(display: display, excludingWindows: [])
            let configuration = SCStreamConfiguration()
            configuration.width = width
            configuration.height = height
            configuration.showsCursor = false

            let image = try await SCScreenshotManager.captureImage(contentFilter: filter, configuration: configuration)
            let encoded = NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:])
            guard let png = encoded else {
                fail("DISPLAY_CAPTURE_PNG_ENCODING_FAILED", "The captured frame could not be encoded as PNG")
            }
            guard png.count <= maximumPNGBytes else {
                fail("DISPLAY_CAPTURE_TOO_LARGE", "The encoded PNG exceeds the 20 MiB capture transport limit")
            }

            emit([
                "ok": true,
                "state": "CAPTURED",
                "display": "primary",
                "format": "image/png",
                "width": image.width,
                "height": image.height,
                "byteCount": png.count,
                "dataBase64": png.base64EncodedString(),
                "cursorIncluded": false,
                "method": "macos-screencapturekit-primary-display-png",
            ], exitCode: 0)
        } catch {
            fail("DISPLAY_CAPTURE_FAILED", "ScreenCaptureKit capture failed: \(type(of: error))")
        }
    }
}
