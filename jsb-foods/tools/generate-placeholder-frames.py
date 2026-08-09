#!/usr/bin/env python3
"""
Placeholder frame generator for the JSB Foods makhana transformation.

Renders 120 WebP frames algorithmically telling the story:
  Stage 1 (0-25):   dark, seed appears, subtle vibration
  Stage 2 (25-55):  bg warms, glow builds around seed
  Stage 3 (55-80):  ember heat peaks, seed cracks & POP
  Stage 4 (80-119): white makhana forms, bg fades to cream

These are placeholders — swap for photoreal renders by dropping
frame-001.webp … frame-120.webp into the same folder.

Usage:  python3 tools/generate-placeholder-frames.py
"""

import math, os, random
from PIL import Image, ImageDraw, ImageFilter

SIZE = 640
COUNT = 120
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "sequence", "makhana")
os.makedirs(OUT_DIR, exist_ok=True)

# ---------- palette helpers ----------
def lerp(a, b, t): return a + (b - a) * t
def lerp_rgb(c1, c2, t):
    return tuple(int(lerp(c1[i], c2[i], t)) for i in range(3))
def clamp(x, lo=0.0, hi=1.0): return max(lo, min(hi, x))
def ease(t): return t*t*(3 - 2*t)  # smoothstep

# scene palette — dark → warm brown → ember → cream
BG_STOPS = [
    (0.00, (14, 8, 6)),       # near black
    (0.25, (26, 14, 8)),      # cocoa
    (0.55, (74, 33, 10)),     # deep brown
    (0.72, (168, 78, 20)),    # ember
    (0.82, (232, 168, 60)),   # gold
    (0.92, (250, 232, 190)),  # buttery cream
    (1.00, (251, 243, 223)),  # jsb cream
]

def bg_color(p):
    for i in range(len(BG_STOPS) - 1):
        a, b = BG_STOPS[i], BG_STOPS[i+1]
        if a[0] <= p <= b[0]:
            t = 0 if b[0] == a[0] else (p - a[0]) / (b[0] - a[0])
            return lerp_rgb(a[1], b[1], ease(t))
    return BG_STOPS[-1][1]

# ---------- rendering ----------
def vignette(img, p):
    """Radial darkening at the edges; strongest when scene is dark."""
    darkness = 1 - clamp((p - 0.5) * 2.5)  # fades out post-pop
    if darkness <= 0: return img
    W, H = img.size
    mask = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(mask)
    steps = 26
    for i in range(steps):
        r = int(min(W, H) * (0.35 + 0.65 * i / steps))
        alpha = int(200 * (i / steps) * darkness)
        d.ellipse((W//2 - r, H//2 - r, W//2 + r, H//2 + r), fill=255 - alpha)
    mask = mask.filter(ImageFilter.GaussianBlur(60))
    overlay = Image.new("RGB", (W, H), (0, 0, 0))
    return Image.composite(img, overlay, mask)


def draw_glow(img, cx, cy, radius, color, alpha):
    """Additive warm glow behind the seed."""
    if alpha <= 0: return
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    steps = 14
    for i in range(steps):
        r = int(radius * (1 - i / steps))
        a = int(alpha * (i / steps) ** 1.5)
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(*color, a))
    layer = layer.filter(ImageFilter.GaussianBlur(28))
    img.alpha_composite(layer)


def draw_seed(img, cx, cy, scale, heat, crack):
    """Dark lotus seed with growing warm rim and cracks."""
    w = int(90 * scale); h = int(112 * scale)
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    # rim heat glow (before body)
    if heat > 0:
        rim = Image.new("RGBA", img.size, (0, 0, 0, 0))
        rd = ImageDraw.Draw(rim)
        for i in range(6):
            pad = i * 3
            rd.ellipse((cx-w-pad, cy-h-pad, cx+w+pad, cy+h+pad),
                       fill=(255, 120, 40, int(60 * heat * (1 - i/6))))
        rim = rim.filter(ImageFilter.GaussianBlur(10))
        layer.alpha_composite(rim)

    # body — warms slightly with heat
    body = lerp_rgb((32, 21, 12), (95, 45, 15), heat * 0.4)
    d.ellipse((cx-w, cy-h, cx+w, cy+h), fill=(*body, 255))

    # subtle stripes
    d.arc((cx-w+6, cy-h+6, cx+w-6, cy+h-6), 260, 280, fill=(255,255,255,20), width=2)
    d.arc((cx-w+6, cy-h+6, cx+w-6, cy+h-6), 80, 100, fill=(255,255,255,20), width=2)

    # highlight
    hlw = int(w * 0.28); hlh = int(h * 0.36)
    d.ellipse((cx - w//3 - hlw//2, cy - h//3 - hlh//2,
               cx - w//3 + hlw//2, cy - h//3 + hlh//2),
              fill=(255, 245, 220, 32))

    # cracks — glowing fissures
    if crack > 0:
        cr = ImageDraw.Draw(layer)
        crack_color = (255, 180, 60, int(255 * crack))
        # jagged center crack
        pts = [(cx, cy - h + 6)]
        rng = random.Random(7)  # deterministic
        y = -h + 6
        while y < h - 6:
            y += 8
            pts.append((cx + rng.randint(-6, 6), cy + y))
        cr.line(pts, fill=crack_color, width=max(2, int(2 + crack * 3)))
        # side branches
        cr.line([(cx-15, cy-20), (cx-w+20, cy-4)], fill=crack_color, width=2)
        cr.line([(cx+10, cy+10),  (cx+w-15, cy+30)], fill=crack_color, width=2)

    img.alpha_composite(layer)


def draw_burst(img, cx, cy, t):
    """The pop burst: expanding white flash + particles."""
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # expanding ring
    r = int(30 + 260 * t)
    ring = int(max(2, 30 * (1 - t)))
    for i in range(4):
        rr = r - i * 3
        alpha = int(220 * (1 - t) * (1 - i/4))
        d.ellipse((cx-rr, cy-rr, cx+rr, cy+rr),
                  outline=(255, 240, 210, alpha), width=ring)
    # radial particles
    rng = random.Random(11)
    for i in range(24):
        angle = (i / 24) * math.tau + rng.uniform(-0.1, 0.1)
        dist = r + rng.uniform(-20, 40)
        px = cx + math.cos(angle) * dist
        py = cy + math.sin(angle) * dist
        pr = int(6 * (1 - t*0.5) + rng.uniform(0, 4))
        alpha = int(255 * (1 - t*0.9))
        d.ellipse((px-pr, py-pr, px+pr, py+pr), fill=(255, 245, 220, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(2))
    img.alpha_composite(layer)


def draw_makhana(img, cx, cy, scale, opacity=1.0):
    """The final roasted makhana — lumpy off-white cloud."""
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # shadow
    sh_w = int(150 * scale); sh_h = int(30 * scale)
    d.ellipse((cx-sh_w, cy+120*scale-sh_h//2, cx+sh_w, cy+120*scale+sh_h//2),
              fill=(30, 15, 8, int(80 * opacity)))
    # lumpy body — overlap several circles for a cloud shape
    base_r = int(110 * scale)
    lumps = [(-40, -20, 90), (35, -35, 75), (30, 25, 82), (-30, 30, 78),
             (0, -50, 65), (-55, 5, 68), (50, 0, 70)]
    for lx, ly, lr in lumps:
        lr = int(lr * scale)
        cxx, cyy = cx + int(lx * scale), cy + int(ly * scale)
        d.ellipse((cxx-lr, cyy-lr, cxx+lr, cyy+lr),
                  fill=(255, 251, 235, int(255 * opacity)))
    # main body
    d.ellipse((cx-base_r, cy-base_r, cx+base_r, cy+base_r),
              fill=(255, 250, 230, int(255 * opacity)))
    # highlights
    hl_r = int(28 * scale)
    d.ellipse((cx-40-hl_r, cy-40-hl_r, cx-40+hl_r, cy-40+hl_r),
              fill=(255, 255, 250, int(200 * opacity)))
    d.ellipse((cx+30-10, cy-20-10, cx+30+10, cy-20+10),
              fill=(255, 255, 250, int(150 * opacity)))
    # soft edge blur
    layer = layer.filter(ImageFilter.GaussianBlur(1.2))
    img.alpha_composite(layer)


def draw_frame(idx):
    p = idx / (COUNT - 1)
    W = H = SIZE
    cx, cy = W // 2, H // 2

    # background
    img = Image.new("RGB", (W, H), bg_color(p))
    img = img.convert("RGBA")

    # subtle grain-y noise via draw (light)
    # skip for perf; vignette carries the mood

    # -- vibration/tremble: sinusoidal, amplitude grows with heat, gone after pop
    heat_amp = clamp(p * 3.5 - 0.3) * (1 - clamp((p - 0.62) * 8))
    tx = math.sin(p * math.pi * 46) * 4 * heat_amp
    ty = math.cos(p * math.pi * 41) * 3.2 * heat_amp
    sx, sy = int(cx + tx), int(cy + ty)

    # -- glow builds up 0.20 → 0.72
    glow_a = int(220 * clamp((p - 0.20) / 0.52))
    glow_r = int(160 + 180 * clamp((p - 0.20) / 0.5))
    if glow_a > 0 and p < 0.85:
        draw_glow(img, cx, cy, glow_r, (255, 130, 40), glow_a)

    # -- stage split
    if p < 0.60:
        heat = clamp((p - 0.15) / 0.45)
        draw_seed(img, sx, sy, scale=1.0, heat=heat, crack=0)
    elif p < 0.70:
        # cracks form
        heat = 1.0
        crack = clamp((p - 0.60) / 0.10)
        draw_seed(img, sx, sy, scale=1.0 + 0.08 * crack, heat=heat, crack=crack)
    elif p < 0.80:
        # THE POP — brief crossover
        pt = clamp((p - 0.70) / 0.10)
        # fading seed
        if pt < 0.6:
            draw_seed(img, sx, sy, scale=1.08 + pt*0.8, heat=1, crack=1 - pt*0.6)
        # explosive burst
        draw_burst(img, cx, cy, pt)
        # emerging makhana
        if pt > 0.35:
            e = (pt - 0.35) / 0.65
            draw_makhana(img, cx, cy, scale=0.4 + 0.7 * e, opacity=e)
    else:
        # settled makhana, gentle scale
        settle = clamp((p - 0.80) / 0.20)
        s = 1.0 + math.sin(settle * math.pi) * 0.06
        draw_makhana(img, cx, cy, scale=s, opacity=1.0)

    # apply vignette (darkens edges early on)
    img = img.convert("RGB")
    img = vignette(img, p)
    return img


def main():
    print(f"Rendering {COUNT} frames → {os.path.abspath(OUT_DIR)}")
    for i in range(COUNT):
        frame = draw_frame(i)
        path = os.path.join(OUT_DIR, f"frame-{i+1:03d}.webp")
        frame.save(path, "WEBP", quality=82, method=4)
        if (i + 1) % 20 == 0 or i == 0:
            print(f"  frame {i+1:>3}/{COUNT}")
    print("Done.")


if __name__ == "__main__":
    main()
