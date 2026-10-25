package com.elioplus.tv;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Environment;
import android.webkit.DownloadListener;

/**
 * Fires the system installer for APK downloads triggered inside the shell
 * (the in-app "Get App" entry which hits the /__update__/ self-update
 * payload). The payload is fetched with the platform DownloadManager into
 * the app's private download folder and opened through a content:// Uri
 * (ApkProvider) so the package installer can read it on every supported
 * API level.
 */
public class APKDownloadListener implements DownloadListener {

    private static final int MAX_POLLS = 240; // ~2 minutes
    private static final long POLL_INTERVAL_MS = 500;
    private static final String UPDATE_FILE = "elio-tv-update.apk";

    private final Context ctx;

    public APKDownloadListener(Context context) {
        ctx = context;
    }

    @Override
    public void onDownloadStart(final String url, String userAgent,
                                String contentDisposition, String mimetype,
                                long contentLength) {
        if (ctx == null || url == null || url.length() == 0) {
            return;
        }

        boolean enqueued = false;
        try {
            DownloadManager dm = (DownloadManager) ctx.getSystemService(Context.DOWNLOAD_SERVICE);
            if (dm != null) {
                DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
                req.setTitle("elio+ Android App");
                req.setDescription("elio+ APK (TV & Mobile)");
                req.setMimeType("application/vnd.android.package-archive");
                req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                req.setDestinationInExternalFilesDir(ctx, Environment.DIRECTORY_DOWNLOADS, UPDATE_FILE);
                req.addRequestHeader("User-Agent", userAgent == null ? "elio-native-shell" : userAgent);

                final long id = dm.enqueue(req);
                enqueued = true;

                Thread watcher = new Thread(new StatusPoller(ctx, id), "elio-apk-install");
                watcher.setDaemon(true);
                watcher.start();
            }
        } catch (Throwable ignored) {
        }

        if (!enqueued) {
            // Last resort on odd devices: hands the raw loopback URL over to
            // whatever browser exists so the user can still grab the APK.
            try {
                Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(i);
            } catch (Throwable ignored) {
            }
        }
    }

    private static class StatusPoller implements Runnable {
        private final Context ctx;
        private final long id;

        StatusPoller(Context context, long downloadId) {
            ctx = context;
            id = downloadId;
        }

        public void run() {
            int polls = 0;
            while (polls < MAX_POLLS) {
                polls++;
                int status = -1;
                try {
                    DownloadManager dm = (DownloadManager) ctx.getSystemService(Context.DOWNLOAD_SERVICE);
                    Cursor c = dm.query(new DownloadManager.Query().setFilterById(id));
                    if (c != null) {
                        while (c.moveToNext()) {
                            status = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                        }
                        c.close();
                    }
                } catch (Throwable ignored) {
                }

                if (status == DownloadManager.STATUS_SUCCESSFUL) {
                    openRecordedFile();
                    return;
                }

                if (status == DownloadManager.STATUS_FAILED) {
                    return;
                }

                try {
                    Thread.sleep(POLL_INTERVAL_MS);
                } catch (InterruptedException ie) {
                    return;
                }
            }
        }

        private void openRecordedFile() {
            try {
                java.io.File dir = ctx.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (dir == null) {
                    dir = ctx.getCacheDir();
                }
                java.io.File f = new java.io.File(dir, UPDATE_FILE);
                if (!f.exists() || f.length() == 0) {
                    return;
                }

                Intent i = new Intent(Intent.ACTION_VIEW);
                if (ctx.getApplicationInfo().targetSdkVersion >= 24) {
                    Uri content = Uri.parse("content://" + ApkProvider.AUTHORITY + "/apk");
                    i.setDataAndType(content, "application/vnd.android.package-archive");
                    i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                } else {
                    i.setDataAndType(Uri.parse("file://" + f.getAbsolutePath()), "application/vnd.android.package-archive");
                }
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(i);
            } catch (Throwable ignored) {
            }
        }
    }
}
