package com.elioplus.tv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;

/**
 * elio+ native shell.
 *
 * Serves the bundled web build (assets/app/) from a privacy-first loopback
 * HTTP server (127.0.0.1 only) and renders it in a fullscreen WebView.
 * Auto-detects Android TV / Leanback devices and boots the UI in TV mode (?tv=1).
 * Works on phones & tablets too (regular launcher).
 */
public class MainActivity extends Activity {

    private WebView mWebView;
    private LocalAssetServer mServer;
    private boolean mIsTV;

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
        s.setLoadWithOverviewMode(false);
        s.setUseWideViewPort(false);
        s.setSupportMultipleWindows(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setNeedInitialFocus(false);

        mWebView.setWebChromeClient(new WebChromeClient());
        mWebView.setWebViewClient(new AppWebViewClient());
        // Sideloads triggered from inside the app (e.g. the "Get App" entry on TV)
        mWebView.setDownloadListener(new APKDownloadListener(this));

        setContentView(mWebView);

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
        if (mWebView != null && mWebView.canGoBack()) {
            mWebView.goBack();
        } else {
            super.onBackPressed();
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
