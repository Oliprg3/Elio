package com.elioplus.tv;

import android.webkit.ValueCallback;

/**
 * Consumes the shell's Back decision after the web app reports whether a UI
 * layer (modal / player screen) handled it. When the app has nothing to
 * close, the shell walks SPA history and finally exits.
 */
public class BackDecision implements ValueCallback {

    private final MainActivity activity;

    public BackDecision(MainActivity activity) {
        this.activity = activity;
    }

    @SuppressWarnings("unchecked")
    @Override
    public void onReceiveValue(Object value) {
        if (activity == null) {
            return;
        }
        String result = value instanceof String ? (String) value : null;
        if (result != null && result.contains("no")) {
            if (activity.mWebView != null && activity.mWebView.canGoBack()) {
                activity.mWebView.goBack();
            } else {
                activity.finish();
            }
        }
    }
}
