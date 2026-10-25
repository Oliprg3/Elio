#!/usr/bin/env python3
"""Generates APK launcher icon + 16:9 TV banner PNGs from public/icon.png.

Pure stdlib: PNG decode/encode via zlib — no Pillow needed.
Outputs: apk-src/res/drawable/elio_icon.png, apk-src/res/drawable/elio_banner.png
"""
import struct
import zlib
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'public', 'icon.png')
OUT_DIR = os.path.join(ROOT, 'apk-src', 'res', 'drawable')

BANNER_W, BANNER_H = 320, 180
ICON_H = 104  # icon height inside banner


def read_png(path):
    with open(path, 'rb') as f:
        data = f.read()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', 'not a png'
    pos = 8
    width = height = None
    bit_depth = color_type = None
    palette = None
    transparency = None
    idat = b''
    while pos < len(data):
        length = struct.unpack('>I', data[pos:pos + 4])[0]
        ctype = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if ctype == b'IHDR':
            width, height, bit_depth, color_type = struct.unpack('>IIBB', chunk[:10])
        elif ctype == b'PLTE':
            palette = [(chunk[i], chunk[i + 1], chunk[i + 2]) for i in range(0, len(chunk), 3)]
        elif ctype == b'tRNS':
            transparency = chunk
        elif ctype == b'IDAT':
            idat += chunk
        elif ctype == b'IEND':
            break
    assert bit_depth == 8, f'unsupported bit depth {bit_depth}'
    raw = zlib.decompress(idat)
    return width, height, color_type, palette, transparency, raw


def unfilter(raw, width, height, bpp):
    stride = width * bpp
    pixels = bytearray(height * stride)
    prev = bytearray(stride)
    pos = 0
    for y in range(height):
        ftype = raw[pos]
        pos += 1
        line = bytearray(raw[pos:pos + stride])
        pos += stride
        if ftype == 1:
            for x in range(bpp, stride):
                line[x] = (line[x] + line[x - bpp]) & 0xFF
        elif ftype == 2:
            for x in range(stride):
                line[x] = (line[x] + prev[x]) & 0xFF
        elif ftype == 3:
            for x in range(stride):
                left = line[x - bpp] if x >= bpp else 0
                line[x] = (line[x] + ((left + prev[x]) >> 1)) & 0xFF
        elif ftype == 4:
            for x in range(stride):
                a = line[x - bpp] if x >= bpp else 0
                b = prev[x]
                c = prev[x - bpp] if x >= bpp else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[x] = (line[x] + pr) & 0xFF
        pixels[y * stride:(y + 1) * stride] = line
        prev = line
    return pixels


def to_rgba(w, h, color_type, palette, trns, raw):
    if color_type == 6:  # RGBA
        return raw, 4
    if color_type == 2:  # RGB
        out = bytearray()
        for i in range(w * h):
            out += raw[i * 3:i * 3 + 3] + b'\xff'
        return out, 4
    if color_type == 3:  # palette
        out = bytearray()
        for i in range(w * h):
            idx = raw[i]
            r, g, b = palette[idx]
            alpha = trns[idx] if (trns and idx < len(trns)) else 255
            out += bytes((r, g, b, alpha))
        return out, 4
    if color_type == 0:  # grayscale
        out = bytearray()
        for i in range(w * h):
            v = raw[i]
            out += bytes((v, v, v, 255))
        return out, 4
    raise AssertionError(f'unsupported color type {color_type}')


def scale_nearest(rgba, w, h, tw, th):
    out = bytearray(tw * th * 4)
    for y in range(th):
        sy = min(h - 1, y * h // th)
        for x in range(tw):
            sx = min(w - 1, x * w // tw)
            si = (sy * w + sx) * 4
            di = (y * tw + x) * 4
            out[di:di + 4] = rgba[si:si + 4]
    return out


def crop_to_ratio(rgba, w, h, ratio):
    bw = int(min(w, h * ratio))
    bh = int(bw / ratio)
    x0 = (w - bw) // 2
    y0 = (h - bh) // 2
    out = bytearray(bw * bh * 4)
    for y in range(bh):
        si = ((y + y0) * w + x0) * 4
        di = y * bw * 4
        out[di:di + bw * 4] = rgba[si:si + bw * 4]
    return out, bw, bh


def encode_png(w, h, rgba, path):
    def chunk(ctype, payload):
        c = ctype + payload
        return struct.pack('>I', len(payload)) + c + struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)

    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    raw = bytearray()
    stride = w * 4
    for y in range(h):
        raw.append(0)
        raw += rgba[y * stride:(y + 1) * stride]
    png = (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) +
           chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)
    return os.path.getsize(path)


def main():
    if not os.path.exists(SRC):
        raise SystemExit(f'missing source icon: {SRC}')
    w, h, color_type, palette, trns, raw = read_png(SRC)
    bpp = 4 if color_type in (2, 6) else 1
    un = unfilter(raw, w, h, bpp)
    rgba, _ = to_rgba(w, h, color_type, palette, trns, un)

    os.makedirs(OUT_DIR, exist_ok=True)

    # Launcher icon: cap at 512 for memory
    if w <= 512:
        icon_out = rgba
        iw, ih = w, h
    else:
        iw = 512
        ih = max(1, h * 512 // w)
        icon_out = scale_nearest(rgba, w, h, iw, ih)
    print('icon', iw, 'x', ih, '->', encode_png(iw, ih, icon_out, os.path.join(OUT_DIR, 'elio_icon.png')), 'bytes')

    # TV banner 320x180: square-ish icon centered, overlaid matte
    src_ratio = w / h
    target_ratio = BANNER_W / BANNER_H
    if abs(src_ratio - target_ratio) < 0.02:
        band, bw, bh = rgba, w, h
    else:
        band, bw, bh = crop_to_ratio(rgba, w, h, 1.0)
    scale = ICON_H / bh
    icw = max(1, int(bw * scale))
    small = scale_nearest(band, bw, bh, icw, ICON_H)
    banner = bytearray(BANNER_W * BANNER_H * 4)
    for i in range(BANNER_W * BANNER_H):
        banner[i * 4 + 3] = 255  # opaque black base
    x0 = (BANNER_W - icw) // 2
    y0 = (BANNER_H - ICON_H) // 2
    for y in range(ICON_H):
        di = ((y + y0) * BANNER_W + x0) * 4
        si = y * icw * 4
        for x in range(icw):
            a = small[si + x * 4 + 3]
            if a:
                d = di + x * 4
                sa = a / 255.0
                for c in range(3):
                    banner[d + c] = int(banner[d + c] * (1 - sa) + small[si + x * 4 + c] * sa)
                banner[d + 3] = 255
    print('banner', BANNER_W, 'x', BANNER_H, '->', encode_png(BANNER_W, BANNER_H, banner, os.path.join(OUT_DIR, 'elio_banner.png')), 'bytes')


if __name__ == '__main__':
    main()
