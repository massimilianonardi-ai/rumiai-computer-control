import AppKit
import Foundation

struct TerminationResult: Codable {
    let ok: Bool
    let state: String
    let bundle: String
    let matched: Int
    let accepted: Bool
    let method: String
    let error: String?
    let detail: String?
}

func emit(_ value: TerminationResult, exitCode: Int32 = 0) -> Never {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    let data = try! encoder.encode(value)
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data("\n".utf8))
    exit(exitCode)
}

guard CommandLine.arguments.count == 2 else {
    emit(TerminationResult(ok:false,state:"FAILED",bundle:"",matched:0,accepted:false,method:"NSRunningApplication.terminate",error:"INVALID_ARGUMENTS",detail:"usage: helper <bundle-id>"), exitCode:2)
}

let bundle = CommandLine.arguments[1].trimmingCharacters(in: .whitespacesAndNewlines)
guard !bundle.isEmpty else {
    emit(TerminationResult(ok:false,state:"FAILED",bundle:bundle,matched:0,accepted:false,method:"NSRunningApplication.terminate",error:"BUNDLE_ID_REQUIRED",detail:"non-empty bundle id required"), exitCode:2)
}

let applications = NSRunningApplication.runningApplications(withBundleIdentifier: bundle)
if applications.isEmpty {
    emit(TerminationResult(ok:true,state:"ALREADY_NOT_RUNNING",bundle:bundle,matched:0,accepted:true,method:"NSRunningApplication.terminate",error:nil,detail:nil))
}

guard applications.count == 1 else {
    emit(TerminationResult(ok:false,state:"FAILED",bundle:bundle,matched:applications.count,accepted:false,method:"NSRunningApplication.terminate",error:"APP_INSTANCE_AMBIGUOUS",detail:"multiple running applications share the resolved bundle identity"), exitCode:4)
}

let accepted = applications[0].terminate()
guard accepted else {
    emit(TerminationResult(ok:false,state:"FAILED",bundle:bundle,matched:1,accepted:false,method:"NSRunningApplication.terminate",error:"APP_TERMINATE_REJECTED",detail:"macOS did not accept the graceful termination request"), exitCode:5)
}

emit(TerminationResult(ok:true,state:"TERMINATION_REQUESTED",bundle:bundle,matched:1,accepted:true,method:"NSRunningApplication.terminate",error:nil,detail:nil))
