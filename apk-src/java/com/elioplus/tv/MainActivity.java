package com.elioplus.tv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;

/**
 * elio+ native shell.
 *
 * Serves the bundled web build (assets/app/) from a privacy-first loopback
 * HTTP server (127.0.0.1 only) and renders it in a fullscreen WebView.
 * Auto-detects Android TV / Leanback devices and boots the UI in TV mode (?tv=1),
 * which renders the exact desktop/tablet layout scaled to fill the screen.
 * Works on phones & tablets too (regular launcher).
 */
public class MainActivity extends Activity {

    WebView mWebView;
    private LocalAssetServer mServer;
    private boolean mIsTV;

    // Fullscreen player support (HTML5 custom view from the stream iframe)
    private FrameLayout mShellLayout;
    private View mCustomView;
    private WebChromeClient.CustomViewCallback mCustomViewCallback;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        mIsTV = isLeanbackDevice();

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);

        mWebView = new WebView(this);
        mWebView.setBackgroundColor(Color.BLACK);

        WebSettings s = mWebView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        // Honor the page's viewport meta so the app controls its own layout:
        // TVs boot with width=1280 (the PC/tablet canvas) scaled to fill the
        // screen instead of the device's raw CSS width which can be far too
        // narrow and breaks the responsive desktop layout under a remote.
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setSupportMultipleWindows(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setNeedInitialFocus(false);
        try {
            String ua = s.getUserAgentString();
            if (ua != null && !ua.contains("elio-native-shell")) {
                s.setUserAgentString(ua + " elio-native-shell");
            }
        } catch (Throwable ignored) {
        }

        mWebView.setWebChromeClient(new FullscreenChromeClient(this));
        mWebView.setWebViewClient(new AppWebViewClient());
        // Sideloads triggered from inside the app (e.g. the "Get App" entry on TV)
        mWebView.setDownloadListener(new APKDownloadListener(this));

        mShellLayout = new FrameLayout(this);
        mShellLayout.addView(mWebView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(mShellLayout);

        mServer = new LocalAssetServer(this);
        mServer.start();

        StringBuilder url = new StringBuilder("http://127.0.0.1:").append(mServer.port()).append("/");
        if (mIsTV) {
            url.append("?tv=1");
        }
        mWebView.loadUrl(url.toString());

        applyImmersive();
    }

    /** Android TV / Leanback / Google TV detection */
    private boolean isLeanbackDevice() {
        try {
            return getPackageManager().hasSystemFeature("android.software.leanback");
        } catch (Throwable t) {
            return false;
        }
    }

    boolean isCustomViewShown() {
        return mCustomView != null;
    }

    void handleShowCustomView(View view, WebChromeClient.CustomViewCallback callback) {
        if (mCustomView != null) {
            try {
                callback.onCustomViewHidden();
            } catch (Throwable ignored) {
            }
            return;
        }
        mCustomView = view;
        mCustomViewCallback = callback;
        mCustomView.setVisibility(View.VISIBLE);
        mShellLayout.addView(view, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        mWebView.setVisibility(View.GONE);
        applyImmersive();
    }

    void handleHideCustomView() {
        if (mCustomView == null) {
            return;
        }
        mShellLayout.removeView(mCustomView);
        mCustomView.setVisibility(View.GONE);
        mCustomView = null;
        mWebView.setVisibility(View.VISIBLE);
        WebChromeClient.CustomViewCallback cb = mCustomViewCallback;
        mCustomViewCallback = null;
        if (cb != null) {
            try {
                cb.onCustomViewHidden();
            } catch (Throwable ignored) {
            }
        }
        applyImmersive();
    }

    private void applyImmersive() {
        View decor = getWindow().getDecorView();
        decor.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyImmersive();
        }
    }

    @Override
    public void onBackPressed() {
        if (mCustomView != null) {
            handleHideCustomView();
            return;
        }
        if (mWebView == null) {
            super.onBackPressed();
            return;
        }
        // Ask the web app first: modals and the streaming screen consume the
        // Back key (window.__elioTvBack). Otherwise walk native history/exit.
        try {
            String js = "window.__elioTvBack ? window.__elioTvBack() : 'go'";
            mWebView.evaluateJavascript(js, new BackDecision(this));
        } catch (Throwable t) {
            if (mWebView.canGoBack()) {
                mWebView.goBack();
            } else {
                super.onBackPressed();
            }
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (mWebView != null) {
            mWebView.onPause();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (mWebView != null) {
            mWebView.onResume();
        }
        applyImmersive();
    }

    @Override
    protected void onDestroy() {
        if (mServer != null) {
            mServer.stop();
        }
        if (mWebView != null) {
            try {
                mWebView.loadUrl("about:blank");
                mWebView.destroy();
            } catch (Throwable ignored) {
            }
            mWebView = null;
        }
        super.onDestroy();
    }
}
