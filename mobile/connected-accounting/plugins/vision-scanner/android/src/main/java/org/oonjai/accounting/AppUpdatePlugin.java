package org.oonjai.accounting;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;

@CapacitorPlugin(name = "OonJaiAppUpdate")
public class AppUpdatePlugin extends Plugin {
    private static final String ENDPOINT = "https://nhjsesfhapnjtwlxvirm.supabase.co/functions/v1/accounting-documents";
    private static final String PACKAGE = "org.oonjai.accounting.preview";
    private static final String SIGNER = "58124eaeb0ff570eeb67d3cbe2121db02369d82fb47a4b3bc1889b233b1bfa8c";
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private File directory() { File dir = new File(getContext().getFilesDir(), "app-updates"); dir.mkdirs(); return dir; }
    private static String hex(byte[] bytes) { StringBuilder out = new StringBuilder(); for (byte b : bytes) out.append(String.format("%02x", b & 255)); return out.toString(); }
    private String digest(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256"); byte[] buffer = new byte[65536];
        try (InputStream in = new FileInputStream(file)) { int n; while ((n = in.read(buffer)) != -1) digest.update(buffer, 0, n); }
        return hex(digest.digest());
    }
    private long version(PackageInfo info) { return Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode; }
    @SuppressWarnings("deprecation")
    private void verify(File file, String hash, long expected) throws Exception {
        if (!hash.matches("[a-f0-9]{64}") || !digest(file).equals(hash)) throw new IOException("Update checksum did not match. Retry the download.");
        PackageManager pm = getContext().getPackageManager();
        int flags = Build.VERSION.SDK_INT >= 28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES;
        PackageInfo info = pm.getPackageArchiveInfo(file.getAbsolutePath(), flags), installed = pm.getPackageInfo(getContext().getPackageName(), 0);
        if (info == null || !PACKAGE.equals(info.packageName) || !PACKAGE.equals(installed.packageName) || version(info) != expected || expected <= version(installed)) throw new IOException("This update does not match this installation.");
        Signature[] certificates = Build.VERSION.SDK_INT >= 28 ? info.signingInfo.getApkContentsSigners() : info.signatures;
        if (certificates == null || certificates.length != 1 || !SIGNER.equals(hex(MessageDigest.getInstance("SHA-256").digest(certificates[0].toByteArray())))) throw new IOException("Update signing certificate did not match.");
    }
    private void progress(long bytes, long total) {
        JSObject data = new JSObject(); data.put("bytes", bytes); data.put("total", total); notifyListeners("progress", data);
    }
    @PluginMethod public void download(PluginCall call) {
        worker.execute(() -> {
            File partial = new File(directory(), "update.part"), apk = new File(directory(), "update.apk"); HttpURLConnection connection = null;
            try {
                String hash = call.getString("sha256", ""); long expected = call.getInt("versionCode", 0);
                if (apk.exists()) { try { verify(apk, hash, expected); call.resolve(new JSObject().put("ready", true)); return; } catch (Exception ignored) {} }
                String token = call.getString("token", ""), key = call.getString("apikey", "");
                if (token.isEmpty() || token.contains("\n") || key.isEmpty()) throw new IOException("Sign in to Accounting to download the update.");
                connection = (HttpURLConnection) new URL(ENDPOINT).openConnection(); connection.setInstanceFollowRedirects(false); connection.setConnectTimeout(15000); connection.setReadTimeout(120000);
                connection.setRequestMethod("POST"); connection.setDoOutput(true); connection.setRequestProperty("Content-Type", "application/json"); connection.setRequestProperty("Authorization", "Bearer " + token); connection.setRequestProperty("apikey", key);
                byte[] body = new JSObject().put("action", "app-update217").put("sha256", hash).toString().getBytes("UTF-8");
                try (OutputStream out = connection.getOutputStream()) { out.write(body); }
                if (connection.getResponseCode() != 200) throw new IOException("Update download is unavailable. Check your Accounting and company Google Drive connection, then retry.");
                long total = connection.getContentLengthLong(), bytes = 0, tick = 0; if (total > 104857600L) throw new IOException("Update is too large.");
                try (InputStream in = connection.getInputStream(); FileOutputStream out = new FileOutputStream(partial)) {
                    byte[] buffer = new byte[65536]; int n;
                    while ((n = in.read(buffer)) != -1) { bytes += n; if (bytes > 104857600L) throw new IOException("Update is too large."); out.write(buffer, 0, n); if (System.currentTimeMillis() - tick > 200) { progress(bytes, total); tick = System.currentTimeMillis(); } }
                    out.getFD().sync();
                }
                verify(partial, hash, expected); if (!partial.renameTo(apk)) throw new IOException("Could not retain the verified update. Retry.");
                call.resolve(new JSObject().put("ready", true));
            } catch (Exception error) { partial.delete(); call.reject(error.getMessage()); }
            finally { if (connection != null) connection.disconnect(); }
        });
    }
    @PluginMethod public void install(PluginCall call) {
        worker.execute(() -> {
            try {
                File apk = new File(directory(), "update.apk"); verify(apk, call.getString("sha256", ""), call.getInt("versionCode", 0));
                getActivity().runOnUiThread(() -> {
                    try {
                        if (Build.VERSION.SDK_INT >= 26 && !getContext().getPackageManager().canRequestPackageInstalls()) {
                            getActivity().startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName())));
                            call.resolve(new JSObject().put("permissionRequired", true)); return;
                        }
                        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".appupdates", apk);
                        Intent intent = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        getActivity().startActivity(intent); call.resolve(new JSObject().put("installerOpened", true));
                    } catch (Exception error) { call.reject(error.getMessage()); }
                });
            } catch (Exception error) { call.reject(error.getMessage()); }
        });
    }
}
