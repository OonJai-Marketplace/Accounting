import Capacitor
import UIKit
import VisionKit

@objc(VisionScannerPlugin)
public class VisionScannerPlugin: CAPPlugin, CAPBridgedPlugin, VNDocumentCameraViewControllerDelegate {
    public let identifier = "VisionScannerPlugin"
    public let jsName = "OonJaiNativeScanner"
    public let pluginMethods = ["scan", "recover", "finish", "prepare"].map { CAPPluginMethod(name: $0, returnType: CAPPluginReturnPromise) }
    private var pending: CAPPluginCall?

    private func directory(_ call: CAPPluginCall) throws -> URL {
        guard let id = call.getString("requestId"), UUID(uuidString: id) != nil else {
            throw NSError(domain: "OonJaiScan", code: 2, userInfo: [NSLocalizedDescriptionKey: "Invalid scan recovery reference."])
        }
        let manager = FileManager.default
        let base = try manager.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        var folder = base.appendingPathComponent("OonJaiPendingScans", isDirectory: true).appendingPathComponent(id, isDirectory: true)
        try manager.createDirectory(at: folder, withIntermediateDirectories: true)
        var values = URLResourceValues(); values.isExcludedFromBackup = true
        try folder.setResourceValues(values)
        return folder
    }

    @objc public func prepare(_ call: CAPPluginCall) { call.resolve() }
    @objc public func recover(_ call: CAPPluginCall) {
        do {
            let manifest = try directory(call).appendingPathComponent("result.json")
            let paths = FileManager.default.fileExists(atPath: manifest.path) ? try JSONSerialization.jsonObject(with: Data(contentsOf: manifest)) as? [String] ?? [] : []
            call.resolve(["scannedImages": paths])
        } catch { call.reject(error.localizedDescription) }
    }
    @objc public func finish(_ call: CAPPluginCall) {
        do { try FileManager.default.removeItem(at: directory(call)); call.resolve() }
        catch { call.reject(error.localizedDescription) }
    }

    @objc public func scan(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.pending == nil else { call.reject("A scan is already open."); return }
            guard VNDocumentCameraViewController.isSupported, let host = self.bridge?.viewController else {
                call.reject("Document scanning is unavailable on this iPhone."); return
            }
            do { _ = try self.directory(call) } catch { call.reject(error.localizedDescription); return }
            self.pending = call
            let camera = VNDocumentCameraViewController()
            camera.delegate = self
            host.present(camera, animated: true)
        }
    }

    public func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
        let call = pending; pending = nil
        controller.dismiss(animated: true) { call?.resolve(["cancelled": true, "scannedImages": []]) }
    }

    public func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFailWithError error: Error) {
        let call = pending; pending = nil
        controller.dismiss(animated: true) { call?.reject(error.localizedDescription) }
    }

    public func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFinishWith scan: VNDocumentCameraScan) {
        // Keep every returned page. VisionKit has no public page-limit API.
        // No private selectors/swizzling, resizing, second crop or color filter.
        let call = pending
        controller.dismiss(animated: true) {
            DispatchQueue.global(qos: .userInitiated).async {
                var files: [URL] = []
                do {
                    guard let call = call else { return }
                    let folder = try self.directory(call)
                    for page in 0..<scan.pageCount {
                        try autoreleasepool {
                            guard let bytes = scan.imageOfPage(at: page).jpegData(compressionQuality: 1.0) else {
                                throw NSError(domain: "OonJaiScan", code: 1, userInfo: [NSLocalizedDescriptionKey: "The scanned page could not be saved."])
                            }
                            let file = folder.appendingPathComponent(UUID().uuidString + ".jpg")
                            try bytes.write(to: file, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
                            files.append(file)
                        }
                    }
                    let manifest = try JSONSerialization.data(withJSONObject: files.map { $0.absoluteString })
                    try manifest.write(to: folder.appendingPathComponent("result.json"), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
                    DispatchQueue.main.async {
                        self.pending = nil
                        call.resolve(["scannedImages": files.map { $0.absoluteString }])
                    }
                } catch {
                    for file in files { try? FileManager.default.removeItem(at: file) }
                    DispatchQueue.main.async { self.pending = nil; call?.reject(error.localizedDescription) }
                }
            }
        }
    }
}
