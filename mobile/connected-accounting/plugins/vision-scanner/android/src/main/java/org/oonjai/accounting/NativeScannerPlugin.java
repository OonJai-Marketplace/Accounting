package org.oonjai.accounting;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import com.getcapacitor.*;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.common.moduleinstall.ModuleInstall;
import com.google.android.gms.common.moduleinstall.ModuleInstallRequest;
import com.google.mlkit.vision.documentscanner.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;

@CapacitorPlugin(name = "OonJaiNativeScanner")
public class NativeScannerPlugin extends Plugin {
    private final ExecutorService files = Executors.newSingleThreadExecutor();
    private boolean scanning = false;

    private File folder(PluginCall call) throws IOException {
        String id = call.getString("requestId", "");
        if (!id.matches("[0-9a-fA-F-]{36}")) throw new IOException("Invalid scan recovery reference.");
        File dir = new File(getContext().getNoBackupFilesDir(), "pending-scans/" + id);
        if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("Cannot protect native scans on this device.");
        return dir;
    }

    @PluginMethod public void prepare(PluginCall call) {
        GmsDocumentScanner client = GmsDocumentScanning.getClient(GmsDocumentScannerOptions.DEFAULT_OPTIONS);
        ModuleInstall.getClient(getContext()).installModules(ModuleInstallRequest.newBuilder().addApi(client).build())
            .addOnSuccessListener(result -> call.resolve()).addOnFailureListener(error -> call.reject(error.getMessage()));
    }

    @PluginMethod public void scan(PluginCall call) {
        if (scanning) { call.reject("A scan is already open."); return; }
        try { folder(call); } catch (Exception error) { call.reject(error.getMessage()); return; }
        scanning = true;
        GmsDocumentScannerOptions.Builder options = new GmsDocumentScannerOptions.Builder()
            .setGalleryImportAllowed(true).setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_JPEG)
            .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_FULL);
        // Deliberately leave the normal page limit UNSET: Google then uses device resources.
        // A retake replaces one receipt and is the only single-page session.
        if (Boolean.TRUE.equals(call.getBoolean("singlePage", false))) options.setPageLimit(1);
        GmsDocumentScanning.getClient(options.build()).getStartScanIntent(getActivity())
            .addOnSuccessListener(sender -> {
                Intent intent = new ActivityResultContracts.StartIntentSenderForResult().createIntent(
                    getContext(), new IntentSenderRequest.Builder(sender).build());
                startActivityForResult(call, intent, "scanResult");
            }).addOnFailureListener(error -> { scanning = false; call.reject(error.getMessage()); });
    }

    @ActivityCallback public void scanResult(PluginCall call, ActivityResult result) {
        scanning = false;
        if (call == null) return;
        if (result.getResultCode() == Activity.RESULT_CANCELED) {
            JSObject cancelled = new JSObject(); cancelled.put("cancelled", true); call.resolve(cancelled); return;
        }
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) { call.reject("The native scan did not finish."); return; }
        GmsDocumentScanningResult scan = GmsDocumentScanningResult.fromActivityResultIntent(result.getData());
        if (scan == null || scan.getPages() == null) { call.reject("No scanned pages were returned."); return; }
        files.execute(() -> {
            try {
                File dir = folder(call); JSONArray paths = new JSONArray();
                for (int i = 0; i < scan.getPages().size(); i++) {
                    File target = new File(dir, i + ".jpg"), temporary = new File(dir, i + ".part");
                    try (InputStream input = getContext().getContentResolver().openInputStream(scan.getPages().get(i).getImageUri());
                         FileOutputStream output = new FileOutputStream(temporary)) {
                        if (input == null) throw new IOException("A scanned page could not be opened.");
                        byte[] buffer = new byte[65536]; int length;
                        while ((length = input.read(buffer)) != -1) output.write(buffer, 0, length);
                        output.getFD().sync();
                    }
                    if (!temporary.renameTo(target)) throw new IOException("A scanned page could not be protected.");
                    paths.put(Uri.fromFile(target).toString());
                }
                File manifest = new File(dir, "result.json"), temp = new File(dir, "result.part");
                try (FileOutputStream output = new FileOutputStream(temp)) {
                    output.write(paths.toString().getBytes(StandardCharsets.UTF_8)); output.getFD().sync();
                }
                if (!temp.renameTo(manifest)) throw new IOException("The scan recovery record could not be saved.");
                JSObject response = new JSObject(); response.put("scannedImages", paths); call.resolve(response);
            } catch (Exception error) { call.reject(error.getMessage()); }
        });
    }

    @PluginMethod public void recover(PluginCall call) {
        files.execute(() -> { try {
            File manifest = new File(folder(call), "result.json");
            JSObject response = new JSObject();
            response.put("scannedImages", manifest.isFile() ? new JSONArray(new String(Files.readAllBytes(manifest.toPath()), StandardCharsets.UTF_8)) : new JSONArray());
            call.resolve(response);
        } catch (Exception error) { call.reject(error.getMessage()); } });
    }

    @PluginMethod public void finish(PluginCall call) {
        files.execute(() -> { try {
            File dir = folder(call); File[] children = dir.listFiles();
            if (children != null) for (File child : children) if (child.isFile()) child.delete();
            dir.delete(); call.resolve();
        } catch (Exception error) { call.reject(error.getMessage()); } });
    }
}
