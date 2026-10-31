import Capacitor
import UIKit
import UniformTypeIdentifiers
import CryptoKit

@objc(AccountingStoragePlugin)
public class AccountingStoragePlugin: CAPPlugin, CAPBridgedPlugin, UIDocumentPickerDelegate {
    public let identifier = "AccountingStoragePlugin"
    public let jsName = "OonJaiStorage"
    public let pluginMethods: [CAPPluginMethod] = ["pickDirectory", "checkDirectory", "createDirectory", "writePDF"].compactMap { CAPPluginMethod(name: $0, returnType: CAPPluginReturnPromise) }
    private var picking: CAPPluginCall?
    private func problem(_ text: String) -> NSError { NSError(domain: "OonJaiStorage", code: 1, userInfo: [NSLocalizedDescriptionKey: text]) }
    private func folder(_ call: CAPPluginCall) throws -> URL {
        guard let data = Data(base64Encoded: call.getString("id") ?? "") else { throw problem("Choose the folder again.") }
        var stale = false
        return try URL(resolvingBookmarkData: data, options: [], relativeTo: nil, bookmarkDataIsStale: &stale)
    }
    private func reference(_ url: URL) throws -> JSObject { ["id": try url.bookmarkData(options: .minimalBookmark, includingResourceValuesForKeys: nil, relativeTo: nil).base64EncodedString(), "name": url.lastPathComponent] }
    @objc public func pickDirectory(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.picking == nil else { call.reject("A folder picker is already open."); return }
            self.picking = call
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.folder], asCopy: false)
            picker.delegate = self; picker.allowsMultipleSelection = false
            if let folder = try? self.folder(call) { picker.directoryURL = folder }
            self.bridge?.viewController?.present(picker, animated: true)
        }
    }
    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) { picking?.resolve(["cancelled": true]); picking = nil }
    public func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        defer { picking = nil }
        do { guard let url = urls.first, url.startAccessingSecurityScopedResource() else { throw problem("Folder permission was not granted.") }; defer { url.stopAccessingSecurityScopedResource() }; picking?.resolve(try reference(url)) }
        catch { picking?.reject(error.localizedDescription) }
    }
    @objc public func checkDirectory(_ call: CAPPluginCall) {
        do { let url = try folder(call); guard url.startAccessingSecurityScopedResource() else { throw problem("Choose this folder again to restore access.") }; defer { url.stopAccessingSecurityScopedResource() }; guard FileManager.default.isWritableFile(atPath: url.path) else { throw problem("This folder is unavailable or read-only.") }; call.resolve(["name": url.lastPathComponent]) } catch { call.reject(error.localizedDescription) }
    }
    @objc public func createDirectory(_ call: CAPPluginCall) {
        do { let parent = try folder(call); guard parent.startAccessingSecurityScopedResource() else { throw problem("Choose the parent folder again.") }; defer { parent.stopAccessingSecurityScopedResource() }
            let name = call.getString("name") ?? ""; guard !name.isEmpty, name.rangeOfCharacter(from: CharacterSet(charactersIn: "/\\").union(.controlCharacters)) == nil else { throw problem("Enter a folder name without slashes.") }
            let child = parent.appendingPathComponent(name, isDirectory: true); try FileManager.default.createDirectory(at: child, withIntermediateDirectories: false); call.resolve(try reference(child))
        } catch { call.reject(error.localizedDescription) }
    }
    @objc public func writePDF(_ call: CAPPluginCall) {
        DispatchQueue.global(qos: .userInitiated).async {
            do { let directory = try self.folder(call); guard directory.startAccessingSecurityScopedResource() else { throw self.problem("Choose the destination again to restore permission.") }; defer { directory.stopAccessingSecurityScopedResource() }
                let name = call.getString("name") ?? "", expected = call.getString("sha256") ?? ""
                guard name.lowercased().hasSuffix(".pdf"), name.count <= 180, name.rangeOfCharacter(from: CharacterSet(charactersIn: "/\\").union(.controlCharacters)) == nil, let source = URL(string: call.getString("source") ?? ""), source.isFileURL else { throw self.problem("Invalid PDF name or source.") }
                let cache = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].resolvingSymlinksInPath().path + "/"
                guard source.resolvingSymlinksInPath().path.hasPrefix(cache) else { throw self.problem("Invalid temporary PDF.") }
                let bytes = try Data(contentsOf: source, options: .mappedIfSafe)
                func hash(_ data: Data) -> String { SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined() }
                guard hash(bytes) == expected else { throw self.problem("The temporary PDF did not pass verification.") }
                let target = directory.appendingPathComponent(name)
                var coordinationError: NSError?, writeError: Error?
                NSFileCoordinator().coordinate(writingItemAt: target, options: [], error: &coordinationError) { destination in
                    do {
                        if FileManager.default.fileExists(atPath: destination.path) { guard hash(try Data(contentsOf: destination, options: .mappedIfSafe)) == expected else { throw self.problem("That filename already exists with different contents. Change the PDF name.") } }
                        else { try bytes.write(to: destination, options: .atomic) }
                        guard hash(try Data(contentsOf: destination, options: .mappedIfSafe)) == expected else { throw self.problem("The saved PDF could not be verified.") }
                    } catch { writeError = error }
                }
                if let error = coordinationError { throw error }; if let error = writeError { throw error }
                call.resolve(["uri": target.absoluteString, "sha256": expected, "verified": true])
            } catch { call.reject(error.localizedDescription) }
        }
    }
}
