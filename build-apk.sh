#!/data/data/com.termux/files/usr/bin/bash
# Builds the real elio+ Android APK (TV leanback + mobile launcher).
#
# Pure Termux pipeline (no Android SDK):
#   aapt2 (resources+manifest) -> javac (code) -> d8 (dex)
#   -> python (zip: dex+assets) -> apksigner (sign)
#
# Usage:   npm run build; ./build-apk.sh
# Result:  public/elio-tv.apk
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
APKSRC="$ROOT/apk-src"
BUILD="$ROOT/.apk-build"
ANDROID_JAR="$BUILD/android.jar"
KEYSTORE="$BUILD/elio.keystore"
DIST="$ROOT/dist"
OUT_PUBLIC="$ROOT/public/elio-tv.apk"

# ---- sanity ----------------------------------------------------------------
command -v aapt2 >/dev/null || { echo "MISSING: aapt2 (pkg install aapt2)"; exit 1; }
command -v d8 >/dev/null || { echo "MISSING: d8 (pkg install d8)"; exit 1; }
command -v apksigner >/dev/null || { echo "MISSING: apksigner (pkg install apksigner)"; exit 1; }
if ! command -v javac >/dev/null; then
  command -v ecj >/dev/null || { echo "MISSING: javac or ecj"; exit 1; }
  COMPILE=(ecj -1.8)
else
  COMPILE=(javac --release 8)
fi
[ -f "$ANDROID_JAR" ] || {
  echo "Downloading android.jar (API 34 stubs)..."
  mkdir -p "$BUILD"
  curl -sL -o "$ANDROID_JAR" \
    "https://raw.githubusercontent.com/Sable/android-platforms/master/android-34/android.jar"
}
[ -d "$DIST" ] || { echo "No dist/ — run 'npm run build' first"; exit 1; }
[ -f "$DIST/index.html" ] || { echo "dist/index.html missing — rebuild first"; exit 1; }

rm -rf "$BUILD/stage" "$BUILD/out"
mkdir -p "$BUILD/stage/assets/app" "$BUILD/stage/assets/selfupdate" "$BUILD/out/classes" "$BUILD/out/dex"

# ---- stage web assets ------------------------------------------------------
# Copy dist into assets/app (the local server's web root).
# The previous generated .apk is excluded from the web root (no recursion);
# it is added as a self-update payload instead.
(cd "$DIST" && find . -type f | sort) | grep -v -e "^\./elio-tv\.apk$" | while read -r f; do
  rel="${f#./}"
  mkdir -p "$BUILD/stage/assets/app/$(dirname "$rel")"
  cp "$DIST/$rel" "$BUILD/stage/assets/app/$rel"
done

[ -f "$OUT_PUBLIC" ] && cp "$OUT_PUBLIC" "$BUILD/stage/assets/selfupdate/elio-tv.apk"

# ---- resources + manifest --------------------------------------------------
aapt2 compile --dir "$APKSRC/res" -o "$BUILD/out/res.zip"
aapt2 link \
  -o "$BUILD/out/base.apk" \
  -I "$ANDROID_JAR" \
  --manifest "$APKSRC/AndroidManifest.xml" \
  --min-sdk-version 23 \
  --target-sdk-version 29 \
  "$BUILD/out/res.zip"

# ---- compile ---------------------------------------------------------------
"${COMPILE[@]}" \
  -d "$BUILD/out/classes" \
  -cp "$ANDROID_JAR" \
  $(find "$APKSRC/java" -name "*.java")

# ---- dex -------------------------------------------------------------------
CLASSES=$(find "$BUILD/out/classes" -name "*.class" | tr '\n' ' ')
d8 --release --min-api 23 --lib "$ANDROID_JAR" \
  --output "$BUILD/out/dex" \
  $CLASSES

# ---- package (append dex + assets) -----------------------------------------
python3 - "$BUILD/out/base.apk" "$BUILD/out/dex/classes.dex" "$BUILD/stage" <<'PYEOF'
import os
import shutil
import sys
import zipfile

base, dex, stage = sys.argv[1], sys.argv[2], sys.argv[3]
tmp = base + '.new'

with zipfile.ZipFile(base, 'r') as src, zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as out:
    for info in src.infolist():
        out.writestr(info, src.read(info.filename))
    out.write(dex, 'classes.dex')
    for root, _dirs, files in os.walk(stage):
        for f in sorted(files):
            p = os.path.join(root, f)
            arc = os.path.relpath(p, stage)
            out.write(p, arc)

shutil.move(tmp, base)
PYEOF

# ---- sign ------------------------------------------------------------------
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -keystore "$KEYSTORE" -alias elio \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass elio-sign -keypass elio-sign \
    -dname "CN=elio TV, OU=elio, O=elio, C=US"
fi
apksigner sign \
  --ks "$KEYSTORE" --ks-pass pass:elio-sign --key-pass pass:elio-sign \
  --out "$OUT_PUBLIC" \
  "$BUILD/out/base.apk"
apksigner verify "$OUT_PUBLIC" && echo "signature: OK"

echo
echo "APK built: $OUT_PUBLIC ($(wc -c < "$OUT_PUBLIC") bytes)"
