package com.elioplus.tv;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.os.Environment;
import android.provider.OpenableColumns;

/**
 * Exposes the downloaded self-update APK to the system package installer on
 * Android 7+ where file:// Uris are prohibited. Read-only, single file.
 */
public class ApkProvider extends ContentProvider {

    public static final String AUTHORITY = "com.elioplus.tv.apk";
    private static final String FILE_NAME = "elio-tv-update.apk";

    private Context appContext;

    @Override
    public boolean onCreate() {
        appContext = getContext();
        return true;
    }

    /** Resolves the update payload: providerclasspath path "/apk". */
    private java.io.File resolveFile() {
        Context c = appContext;
        if (c == null) return null;
        try {
            java.io.File dir = c.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if (dir == null) dir = c.getCacheDir();
            java.io.File f = new java.io.File(dir, FILE_NAME);
            return f;
        } catch (Throwable t) {
            return null;
        }
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) {
        java.io.File f = resolveFile();
        if (f == null || !f.exists()) {
            return null;
        }
        try {
            return ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY);
        } catch (Throwable t) {
            return null;
        }
    }

    @Override
    public String getType(Uri uri) {
        return "application/vnd.android.package-archive";
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection,
                        String[] selectionArgs, String sortOrder) {
        if (projection == null) {
            projection = new String[] { OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE };
        }
        String[] cols = new String[projection.length];
        Object[] vals = new Object[projection.length];
        for (int i = 0; i < projection.length; i++) {
            cols[i] = projection[i];
            if (OpenableColumns.SIZE.equals(projection[i])) {
                java.io.File f = resolveFile();
                vals[i] = (f != null && f.exists()) ? Long.valueOf(f.length()) : Long.valueOf(0);
            } else {
                vals[i] = FILE_NAME;
            }
        }
        MatrixCursor cursor = new MatrixCursor(cols);
        cursor.addRow(vals);
        return cursor;
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        return null;
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        return 0;
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        return 0;
    }
}
