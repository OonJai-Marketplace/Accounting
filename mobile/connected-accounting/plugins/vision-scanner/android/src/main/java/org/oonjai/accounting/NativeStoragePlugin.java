package org.oonjai.accounting;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.DocumentsContract;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.io.*;
import java.security.MessageDigest;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;

@CapacitorPlugin(name = "OonJaiStorage")
public class NativeStoragePlugin extends Plugin {
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private Uri root(String value) throws Exception {
        Uri tree = Uri.parse(value);
        if (!"content".equals(tree.getScheme()) || !DocumentsContract.isTreeUri(tree)) throw new IOException("Choose a folder again.");
        return DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.isDocumentUri(getContext(), tree) ? DocumentsContract.getDocumentId(tree) : DocumentsContract.getTreeDocumentId(tree));
    }
    private String hash(Uri uri) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream in = getContext().getContentResolver().openInputStream(uri)) {
            if (in == null) throw new IOException("Cannot verify the saved PDF.");
            byte[] bytes = new byte[65536]; int n;
            while ((n = in.read(bytes)) != -1) digest.update(bytes, 0, n);
        }
        StringBuilder out = new StringBuilder(); for (byte b : digest.digest()) out.append(String.format("%02x", b)); return out.toString();
    }
    private String folderName(Uri document) throws Exception {
        try (Cursor c = getContext().getContentResolver().query(document, new String[]{DocumentsContract.Document.COLUMN_DISPLAY_NAME, DocumentsContract.Document.COLUMN_FLAGS}, null, null, null)) {
            if (c == null || !c.moveToFirst() || (c.getInt(1) & DocumentsContract.Document.FLAG_DIR_SUPPORTS_CREATE) == 0) throw new IOException("This folder is unavailable or read-only. Choose it again.");
            String id = DocumentsContract.getDocumentId(document);
            return id.contains(":") ? id.replace("primary:", "Phone / ").replace(":", " / ") : c.getString(0);
        }
    }
    @PluginMethod public void pickDirectory(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
        if (Build.VERSION.SDK_INT >= 26 && call.getString("id") != null) intent.putExtra(DocumentsContract.EXTRA_INITIAL_URI, Uri.parse(call.getString("id")));
        startActivityForResult(call, intent, "directorySelected");
    }
    @ActivityCallback public void directorySelected(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) { JSObject out = new JSObject(); out.put("cancelled", true); call.resolve(out); return; }
        try {
            Uri uri = result.getData().getData(); if (uri == null) throw new IOException("No folder selected.");
            int flags = result.getData().getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            getContext().getContentResolver().takePersistableUriPermission(uri, flags);
            JSObject out = new JSObject(); out.put("id", uri.toString()); out.put("name", folderName(root(uri.toString()))); call.resolve(out);
        } catch (Exception e) { call.reject(e.getMessage()); }
    }
    @PluginMethod public void checkDirectory(PluginCall call) {
        io.execute(() -> { try { JSObject out = new JSObject(); out.put("name", folderName(root(call.getString("id", "")))); call.resolve(out); } catch (Exception e) { call.reject(e.getMessage()); } });
    }
    @PluginMethod public void createDirectory(PluginCall call) {
        io.execute(() -> { try {
            String name = call.getString("name", "").trim(); if (name.isEmpty() || name.matches(".*[\\\\/\\x00-\\x1f].*")) throw new IOException("Enter a folder name without slashes.");
            Uri parent = root(call.getString("id", ""));
            Uri made = DocumentsContract.createDocument(getContext().getContentResolver(), parent, DocumentsContract.Document.MIME_TYPE_DIR, name);
            if (made == null) throw new IOException("Folder creation failed.");
            // Retain the selected ancestor's permission and address its new child.
            JSObject out = new JSObject(); out.put("id", made.toString()); out.put("name", folderName(made)); call.resolve(out);
        } catch (Exception e) { call.reject(e.getMessage()); } });
    }
    @PluginMethod public void writePDF(PluginCall call) {
        io.execute(() -> {
            Uri created = null;
            try {
                String name = call.getString("name", ""), expected = call.getString("sha256", "");
                if (!name.toLowerCase().endsWith(".pdf") || name.length() > 180 || name.matches(".*[\\\\/\\x00-\\x1f].*") || !expected.matches("[0-9a-f]{64}")) throw new IOException("Invalid PDF name or checksum.");
                Uri parent = root(call.getString("id", "")); folderName(parent);
                Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(parent, DocumentsContract.getDocumentId(parent));
                try (Cursor c = getContext().getContentResolver().query(children, new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME}, null, null, null)) {
                    while (c != null && c.moveToNext()) if (name.equals(c.getString(1))) {
                        Uri existing = DocumentsContract.buildDocumentUriUsingTree(parent, c.getString(0));
                        if (!expected.equals(hash(existing))) throw new IOException("That filename already exists with different contents. Change the PDF name.");
                        JSObject out = new JSObject(); out.put("uri", existing.toString()); out.put("sha256", expected); out.put("verified", true); call.resolve(out); return;
                    }
                }
                Uri source = Uri.parse(call.getString("source", ""));
                File sourceFile = new File(source.getPath()).getCanonicalFile();
                if (!"file".equals(source.getScheme()) || !sourceFile.getPath().startsWith(getContext().getCacheDir().getCanonicalPath() + File.separator)) throw new IOException("Invalid temporary PDF.");
                created = DocumentsContract.createDocument(getContext().getContentResolver(), parent, "application/pdf", ".pending-" + UUID.randomUUID() + ".pdf");
                if (created == null) throw new IOException("Cannot create a PDF in this folder.");
                try (InputStream in = new FileInputStream(sourceFile); OutputStream out = getContext().getContentResolver().openOutputStream(created, "w")) {
                    if (out == null) throw new IOException("The destination is not writable.");
                    byte[] bytes = new byte[65536]; int n; while ((n = in.read(bytes)) != -1) out.write(bytes, 0, n); out.flush();
                }
                if (!expected.equals(hash(created))) throw new IOException("The saved PDF did not pass verification. Your draft is retained.");
                Uri saved = DocumentsContract.renameDocument(getContext().getContentResolver(), created, name);
                if (saved == null) throw new IOException("The PDF could not be named. Choose a different folder.");
                created = null; JSObject out = new JSObject(); out.put("uri", saved.toString()); out.put("sha256", expected); out.put("verified", true); call.resolve(out);
            } catch (Exception e) {
                if (created != null) try { DocumentsContract.deleteDocument(getContext().getContentResolver(), created); } catch (Exception ignored) { }
                call.reject(e.getMessage());
            }
        });
    }
}
