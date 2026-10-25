package com.elioplus.tv;

import android.view.View;
import android.webkit.WebChromeClient;

/**
 * WebChromeClient that wires the player iframe's HTML5 fullscreen button to a
 * real fullscreen custom view. Without this, pressing fullscreen inside the
 * stream player on TV does nothing (or renders a dead black panel).
 */
public class FullscreenChromeClient extends WebChromeClient {

    private final MainActivity activity;

    public FullscreenChromeClient(MainActivity activity) {
        this.activity = activity;
    }

    @Override
    public void onShowCustomView(final View view, final CustomViewCallback callback) {
        if (activity.isCustomViewShown()) {
            try {
                callback.onCustomViewHidden();
            } catch (Throwable ignored) {
            }
            return;
        }
        activity.handleShowCustomView(view, callback);
    }

    @Override
    public void onHideCustomView() {
        activity.handleHideCustomView();
    }
}
