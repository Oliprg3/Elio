package com.elioplus.tv;

import android.content.Context;

import java.io.BufferedReader;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URLDecoder;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Minimal loopback HTTP server (127.0.0.1 only) streaming files from the APK
 * 'assets/app/' directory. Falls back to index.html so the single-page app
 * resolves every path. '/__update__/&lt;file&gt;' serves the self-update APK
 * payload from 'assets/selfupdate/&lt;file&gt;' as a forced download.
 *
 * No anonymous classes (R8 3.3 on Termux cannot dex javac-21 anonymous shapes).
 */
public class LocalAssetServer {

    private final Context ctx;
    private final AtomicBoolean running = new AtomicBoolean(true);
    private volatile ServerSocket socket;
    private int port = 8090;

    public LocalAssetServer(Context context) {
        ctx = context;
    }

    public int port() {
        return port;
    }

    public void start() {
        Thread t = new Thread(new AcceptLoop(this), "elio-asset-server");
        t.setDaemon(true);
        t.start();
    }

    public void stop() {
        running.set(false);
        try {
            if (socket != null) {
                socket.close();
            }
        } catch (Throwable ignored) {
        }
    }

    private void listen() {
        while (running.get()) {
            try {
                ServerSocket ss = new ServerSocket(port, 64, InetAddress.getByName("127.0.0.1"));
                socket = ss;
                while (running.get()) {
                    final Socket client = ss.accept();
                    Thread h = new Thread(new ConnHandler(this, client), "elio-asset-conn");
                    h.setDaemon(true);
                    h.start();
                }
                return; // clean stop
            } catch (Throwable e) {
                if (!running.get()) {
                    return;
                }
                port++; // port already taken — bump and retry
                try {
                    Thread.sleep(50);
                } catch (InterruptedException ie) {
                    return;
                }
            }
        }
    }

    void handleConnection(Socket client) {
        try {
            client.setTcpNoDelay(true);
            BufferedReader reader = new BufferedReader(new InputStreamReader(client.getInputStream()));
            String line = reader.readLine();
            String path = "/";
            if (line != null && line.startsWith("GET ")) {
                int end = line.indexOf(' ', 4);
                String raw = line.substring(4, end > 4 ? end : line.length());
                int q = raw.indexOf('?');
                if (q >= 0) {
                    raw = raw.substring(0, q);
                }
                try {
                    path = URLDecoder.decode(raw, "UTF-8");
                } catch (Throwable ignored) {
                    path = "/";
                }
            }
            String ignore;
            while ((ignore = reader.readLine()) != null && ignore.length() > 0) {
                // drain remaining request headers
            }
            handleResponse(client, path);
        } catch (Throwable ignored) {
        } finally {
            try {
                client.close();
            } catch (Throwable ignored) {
            }
        }
    }

    private void handleResponse(Socket client, String path) {
        try {
            // self-update payload: assets/selfupdate/<name> as forced download
            if (path.startsWith("/__update__/")) {
                String name = path.substring("/__update__/".length());
                if (name.length() > 0 && !name.contains("..") && !name.contains("\\")) {
                    try {
                        InputStream up = ctx.getAssets().open("selfupdate/" + name);
                        byte[] body = readAll(up);
                        try { up.close(); } catch (Throwable ignored) { }
                        StringBuilder head = new StringBuilder();
                        head.append("HTTP/1.0 200 OK\r\n");
                        head.append("Content-Type: application/vnd.android.package-archive\r\n");
                        head.append("Content-Disposition: attachment; filename=\"").append(name).append("\"\r\n");
                        head.append("Content-Length: ").append(body.length).append("\r\n");
                        head.append("Cache-Control: no-store\r\n\r\n");
                        OutputStream out = new BufferedOutputStream(client.getOutputStream(), 1 << 16);
                        out.write(head.toString().getBytes("ISO-8859-1"));
                        out.write(body);
                        out.flush();
                        return;
                    } catch (IOException e2) {
                        writeResponse(client, 404, "text/plain", new byte[0]);
                        return;
                    }
                }
                writeResponse(client, 404, "text/plain", new byte[0]);
                return;
            }

            String clean = path;
            if (clean.startsWith("/")) {
                clean = clean.substring(1);
            }
            if (clean.contains("..") || clean.contains("\\") || clean.contains("\u0000")) {
                writeResponse(client, 403, "text/plain", new byte[0]);
                return;
            }
            if (clean.length() == 0) {
                clean = "index.html";
            }
            if (clean.endsWith("/")) {
                clean = clean + "index.html";
            }

            String mime = mimeType(clean);
            InputStream is = null;
            try {
                is = ctx.getAssets().open("app/" + clean);
            } catch (IOException e) {
                if (is != null) {
                    try { is.close(); } catch (Throwable ignored) { }
                }
                // SPA fallback: any unknown route resolves to the app entry
                clean = "index.html";
                mime = mimeType(clean);
                try {
                    is = ctx.getAssets().open("app/" + clean);
                } catch (IOException e2) {
                    writeResponse(client, 404, "text/plain", new byte[0]);
                    return;
                }
            }

            byte[] body = readAll(is);
            try { is.close(); } catch (Throwable ignored) { }

            StringBuilder head = new StringBuilder();
            head.append("HTTP/1.0 200 OK\r\n");
            head.append("Content-Type: ").append(mime).append("\r\n");
            head.append("Content-Length: ").append(body.length).append("\r\n");
            head.append("Access-Control-Allow-Origin: *\r\n");
            head.append("Cache-Control: no-cache\r\n");
            head.append("Connection: close\r\n\r\n");

            OutputStream out = new BufferedOutputStream(client.getOutputStream(), 1 << 16);
            out.write(head.toString().getBytes("ISO-8859-1"));
            out.write(body);
            out.flush();
        } catch (Throwable ignored) {
        }
    }

    private void writeResponse(Socket client, int code, String mime, byte[] body) {
        try {
            StringBuilder head = new StringBuilder();
            head.append("HTTP/1.0 ").append(code).append(" elio\r\n");
            head.append("Content-Type: ").append(mime).append("\r\n");
            head.append("Content-Length: ").append(body.length).append("\r\n\r\n");
            OutputStream out = client.getOutputStream();
            out.write(head.toString().getBytes("ISO-8859-1"));
            out.write(body);
            out.flush();
        } catch (Throwable ignored) {
        }
    }

    private byte[] readAll(InputStream in) throws IOException {
        ByteArrayOutputStream buf = new ByteArrayOutputStream(1 << 16);
        byte[] chunk = new byte[1 << 16];
        int n;
        while ((n = in.read(chunk)) > 0) {
            buf.write(chunk, 0, n);
        }
        return buf.toByteArray();
    }

    private String mimeType(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html") || p.endsWith(".htm")) return "text/html";
        if (p.endsWith(".js") || p.endsWith(".mjs")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".webmanifest")) return "application/manifest+json";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".gif")) return "image/gif";
        if (p.endsWith(".ico")) return "image/x-icon";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".woff")) return "font/woff";
        if (p.endsWith(".ttf")) return "font/ttf";
        if (p.endsWith(".otf")) return "font/otf";
        if (p.endsWith(".mp4")) return "video/mp4";
        if (p.endsWith(".webm")) return "video/webm";
        if (p.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
        if (p.endsWith(".ts")) return "video/mp2t";
        if (p.endsWith(".vtt")) return "text/vtt";
        if (p.endsWith(".txt")) return "text/plain";
        if (p.endsWith(".apk")) return "application/vnd.android.package-archive";
        return "application/octet-stream";
    }

    private static class AcceptLoop implements Runnable {
        private final LocalAssetServer server;

        AcceptLoop(LocalAssetServer s) {
            server = s;
        }

        public void run() {
            server.listen();
        }
    }

    private static class ConnHandler implements Runnable {
        private final LocalAssetServer server;
        private final Socket client;

        ConnHandler(LocalAssetServer s, Socket c) {
            server = s;
            client = c;
        }

        public void run() {
            server.handleConnection(client);
        }
    }
}
