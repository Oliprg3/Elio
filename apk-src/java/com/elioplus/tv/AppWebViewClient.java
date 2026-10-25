package com.elioplus.tv;

import android.content.Intent;
import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Keeps navigation inside the shell, hands installs/%package intents to the
 * system and tries the external browser for regular links when possible.
 */
public class AppWebViewClient extends WebViewClient {

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, String url) {
        if (url == null) {
            return false;
        }
        Uri parsed = Uri.parse(url);
        String host = parsed.getHost();

        // Loopback origin (the shell's own local asset server): keep all
        // navigation in-app. In particular let APK links flow to the
        // DownloadListener which fetches them with the DownloadManager and
        // launches the system installer.
        if (host != null && (host.equals("127.0.0.1") || host.equals("localhost"))) {
            return false;
        }

        // Self-update packages from external hosts still open as installs
        if (url.contains("/elio-tv.apk")) {
            try {
                Intent i = new Intent(Intent.ACTION_VIEW, parsed);
                view.getContext().startActivity(i);
            } catch (Throwable ignored) {
            }
            return true;
        }

        // External pages: try the system browser, otherwise stay in the shell
        if (url.startsWith("http://") || url.startsWith("https://")) {
            if (host != null) {
                try {
                    view.getContext().startActivity(
                            new Intent(Intent.ACTION_VIEW, parsed));
                    return true;
                } catch (Throwable ignored) {
                }
            }
        }
        return false;
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        return shouldOverrideUrlLoading(view, String.valueOf(request.getUrl()));
    }
}
