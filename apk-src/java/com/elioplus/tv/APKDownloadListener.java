package com.elioplus.tv;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.webkit.DownloadListener;

/**
 * Fires the system installer for APK downloads (used by the in-app
 * "Download APK" action that hits the self-update payload).
 */
public class APKDownloadListener implements DownloadListener {

    private final Context ctx;

    public APKDownloadListener(Context context) {
        ctx = context;
    }

    @Override
    public void onDownloadStart(String url, String userAgent,
                                String contentDisposition, String mimetype,
                                long contentLength) {
        if (url == null || ctx == null) {
            return;
        }
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(i);
        } catch (Throwable ignored) {
        }
    }
}
