"""
Pure-code generated scene backgrounds (vector-style illustrations) for Reels.

Takes:
  argv[1] = out dir           (render dir where bg0.png..bgN.png will be saved)
  argv[2] = business type     (food, fashion, gym, beauty, tech, travel/nature, general)
  argv[3] = festival key      (diwali, navratri, holi, christmas, newyear, none)
  argv[4] = palette JSON  ["#c0","#c1","#c2"]
  argv[5] = accent hex        "#FFD54F"
  argv[6] = num scenes        "5"
  argv[7] = useIndic          "1"/"0"

Draws rich illustrated full-bleed 1080x1920 backgrounds (one per scene) with
abstract category motifs + festival motifs blended in. Prints JSON list of files.
"""
import sys
import math
import json
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont

random.seed(7)

OUT = sys.argv[1] if len(sys.argv) > 1 else "."
CAT = (sys.argv[2] or "general").lower()
FEST = (sys.argv[3] or "none").lower()
try:
    PAL = json.loads(sys.argv[4]) if len(sys.argv) > 4 else ["#6C5CE7", "#00CEA7", "#8B5CF6"]
except Exception:
    PAL = ["#6C5CE7", "#00CEA7", "#8B5CF6"]
ACCENT = sys.argv[5] if len(sys.argv) > 5 else "#FFD54F"
N = int(sys.argv[6]) if len(sys.argv) > 6 else 5
INDIC = len(sys.argv) > 7 and sys.argv[7] == "1"

W, H = 1080, 1920


def _font(size):
    names = ["C:/Windows/Fonts/DejaVuSans.ttf", "C:/Windows/Fonts/arial.ttf",
             "C:/Windows/Fonts/impact.ttf", "C:/Windows/Fonts/Nirmala.ttf",
             "C:/Windows/Fonts/arialbd.ttf"]
    for n in names:
        try:
            return ImageFont.truetype(n, size)
        except Exception:
            pass
    return ImageFont.load_default()


def _hex(c):
    c = c.lstrip("#")
    if len(c) == 6:
        return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16))
    return (255, 213, 79)


def _glow(img, d, xy, radius, color, max_a):
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse(xy, fill=(color[0], color[1], color[2], max_a))
    glow = glow.filter(ImageFilter.GaussianBlur(radius / 2))
    img.alpha_composite(glow)


def _grad_bg(c0, c1, vertical=True, radial_center=None):
    im = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(im)
    if radial_center:
        steps = 300
        for i in range(steps):
            t = i / steps
            r = t * W
            col = tuple(int(c0[k] + (c1[k] - c0[k]) * t) for k in range(3))
            d.ellipse([radial_center[0] - r, radial_center[1] - r,
                       radial_center[0] + r, radial_center[1] + r], fill=col)
        return im
    steps = 300
    for i in range(steps):
        t = i / steps
        col = tuple(int(c0[k] + (c1[k] - c0[k]) * t) for k in range(3))
        if vertical:
            d.line([(0, int(H * t)), (W, int(H * t))], fill=col, width=int(H / steps) + 1)
        else:
            d.line([(int(W * t), 0), (int(W * t), H)], fill=col, width=int(W / steps) + 1)
    return im


def _draw_diagonal_rays(im, d, cx, cy, col, a, count=14, r_out=1500):
    for i in range(count):
        a0 = math.radians(i * (360 / count))
        a1 = math.radians(i * (360 / count) + (360 / count) * 0.45)
        pts = [(cx, cy),
               (cx + r_out * math.cos(a0), cy + r_out * math.sin(a0)),
               (cx + r_out * math.cos(a1), cy + r_out * math.sin(a1))]
        d.polygon(pts, fill=(col[0], col[1], col[2], a))


def _draw_circles(im, d, col, a, n=8, seed=1):
    rnd = random.Random(seed)
    for _ in range(n):
        x = rnd.randint(0, W)
        y = rnd.randint(0, H)
        r = rnd.randint(30, 260)
        d.ellipse([x - r, y - r, x + r, y + r], outline=(col[0], col[1], col[2], a), width=8)


# ---------- festival motifs (drawn over any background) ----------
def _motif_diya(im, d, x, y, s=1.0, accent=None):
    ac = _hex(ACCENT)
    flame = (255, 150, 40)
    d.polygon([(x - 60 * s, y), (x + 60 * s, y), (x, y - 90 * s)], fill=(200, 120, 20, 255))
    d.polygon([(x - 40 * s, y), (x + 40 * s, y), (x, y - 60 * s)], fill=(245, 170, 30, 255))
    d.ellipse([x - 16 * s, y - 150 * s, x + 16 * s, y - 70 * s], fill=(250, 120, 30, 255))
    d.ellipse([x - 9 * s, y - 132 * s, x + 9 * s, y - 100 * s], fill=(255, 220, 120, 255))


def _motif_rangoli(im, d, cx, cy, col, r0=120, r1=420, petals=12, a=120):
    for k in range(petals):
        ang = math.radians(k * (360 / petals))
        # petal from center outward
        for t in range(int(r0), int(r1), 18):
            r = t
            x0 = cx + r * math.cos(ang)
            y0 = cy + r * math.sin(ang)
            d.ellipse([x0 - 26, y0 - 26, x0 + 26, y0 + 26],
                      outline=(col[0], col[1], col[2], a), width=10)
    d.ellipse([cx - r0, cy - r0, cx + r0, cy + r0], outline=(255, 255, 255, 90), width=12)


def _motif_lantern(im, d, x, y, col, s=1.0):
    d.ellipse([x - 70 * s, y - 55 * s, x + 70 * s, y + 55 * s],
              outline=(col[0], col[1], col[2], 200), width=7)
    d.ellipse([x - 70 * s, y - 55 * s, x + 70 * s, y + 55 * s],
              fill=(col[0], col[1], col[2], 70))
    d.line([(x, y - 55 * s), (x, y - 120 * s)], fill=(col[0], col[1], col[2], 180), width=6)
    d.ellipse([x - 22 * s, y - 150 * s, x + 22 * s, y - 110 * s], fill=(250, 190, 60, 200))


def _motif_garbo(im, d, cx, cy, col, a=110, dots=26, r=360):
    for k in range(dots):
        ang = math.radians(k * (360 / dots))
        x = cx + r * math.cos(ang)
        y = cy + r * math.sin(ang)
        d.ellipse([x - 66, y - 66, x + 66, y + 66],
                  fill=(col[0], col[1], col[2], a), width=14)
    d.ellipse([cx - (r + 80), cy - (r + 80), cx + (r + 80), cy + (r + 80)],
              outline=(255, 255, 255, 80), width=10)


def _motif_drum(im, d, x, y, col, s=1.0):
    d.rounded_rectangle([x - 150 * s, y - 250 * s, x + 150 * s, y + 250 * s],
                        radius=80, outline=(col[0], col[1], col[2], 220), width=10,
                        fill=(col[0], col[1], col[2], 60))
    d.line([(x - 150 * s, y - 80 * s), (x + 150 * s, y - 80 * s)],
           fill=(col[0], col[1], col[2], 200), width=10)


def _motif_mountain(im, d, x, y, col, s=1.0):
    d.polygon([(x - 260 * s, y), (x, y - 280 * s), (x + 260 * s, y)],
              fill=(col[0], col[1], col[2], 110))
    d.polygon([(x - 60 * s, y), (x + 140 * s, y - 170 * s), (x + 340 * s, y)],
              fill=(255, 255, 255, 90))
    wx = x - 60 * s
    d.polygon([(wx - 22, y - 140 * s), (wx - 6, y - 70 * s), (wx + 22, y - 120 * s), (wx + 40, y - 40 * s), (wx + 8, y - 10 * s)],
              fill=(255, 255, 255, 210))
    crop = 160
    d.polygon([(wx - 22, y - 140 * s), (wx + 40, y - 40 * s), (wx + 8, y - 10 * s),
               (wx - crop, y - 2 * s), (wx - crop, y - 200 * s)],
              fill=(255, 255, 255, 210))


def _motif_cloud(im, d, x, y, col, a=160, s=1.0):
    d.ellipse([x - 150 * s, y - 45 * s, x + 150 * s, y + 45 * s], fill=col + (a,))
    d.ellipse([x - 80 * s, y - 90 * s, x + 60 * s, y + 15 * s], fill=col + (a,))
    d.ellipse([x + 30 * s, y - 70 * s, x + 150 * s, y + 20 * s], fill=col + (a,))


def _motif_sun(im, d, x, y, col=(255, 170, 60, 255), r=120):
    _glow(im, d, (x - r, y - r, x + r, y + r), 260, col[:3], 40)
    d.ellipse([x - r, y - r, x + r, y + r], fill=col)


def _motif_pizza(im, d, x, y, s=1.0):
    crust = (230, 160, 50, 255)
    cheese = (250, 205, 90, 255)
    d.polygon([(x, y - 260 * s), (x - 300 * s, y + 150 * s), (x + 300 * s, y + 150 * s)],
              fill=crust)
    d.polygon([(x, y - 220 * s), (x - 250 * s, y + 130 * s), (x + 250 * s, y + 130 * s)],
              fill=cheese)
    for off in [(0, 0, 70), (-110, 90, 55), (110, 90, 55), (-60, 150, 40), (60, 150, 40)]:
        d.ellipse([x + off[0] - 34, y + off[1] - 34, x + off[0] + 34, y + off[1] + 34],
                  fill=(190, 30, 30, 255))
    d.arc([x - 230 * s, y - 200 * s, x + 210 * s, y + 160 * s], 0, 360, fill=(255, 255, 255, 120), width=10)


def _motif_dumbbell(im, d, x, y, s=1.0, col=None):
    c = col or (215, 215, 235, 120)
    d.rounded_rectangle([x - 14 * s, y - 210 * s, x + 14 * s, y + 210 * s], radius=10, fill=c)
    for wi, woff in [(70, 250), (70, 190), (44, 40), (44, -40), (70, -190), (70, -250)]:
        d.rounded_rectangle([x - 14 * s, y - woff - wi * s, x + 14 * s, y - woff + wi * s],
                            radius=12, fill=c)


def _motif_dress(im, d, x, y, s=1.0, col=None):
    c = col or (255, 200, 220, 150)
    d.polygon([(x, y - 300 * s), (x - 150 * s, y), (x - 60 * s, y), (x - 60 * s, y + 300 * s),
               (x + 60 * s, y + 300 * s), (x + 60 * s, y), (x + 150 * s, y)], fill=c)
    d.ellipse([x - 70 * s, y - 350 * s, x + 70 * s, y - 220 * s], fill=c)


def _motif_sparkle(im, d, x, y, col, a=220, s=1.0):
    d.polygon([(x, y - 90 * s), (x + 22 * s, y), (x, y + 90 * s), (x - 22 * s, y)],
              fill=col + (a,))
    d.polygon([(x - 90 * s, y), (x, y - 22 * s), (x + 90 * s, y), (x, y + 22 * s)],
              fill=col + (a,))
    d.ellipse([x - 30 * s, y - 30 * s, x + 30 * s, y + 30 * s], fill=(255, 255, 255, 230))


def _motif_circuit(im, d, x, y, col, a=150, s=1.0):
    for i in range(6):
        ang = math.radians(i * 60)
        d.line([(x, y), (x + 420 * s * math.cos(ang), y + 420 * s * math.sin(ang))],
               fill=(col[0], col[1], col[2], a), width=10)
        ex = x + 420 * s * math.cos(ang)
        ey = y + 420 * s * math.sin(ang)
        d.ellipse([ex - 34, ey - 34, ex + 34, ey + 34], fill=(col[0], col[1], col[2], a + 40))
    d.ellipse([x - 90, y - 90, x + 90, y + 90], fill=(255, 255, 255, 230))


def _motif_gift(im, d, x, y, col, s=1.0, accent=None):
    d.rectangle([x - 180 * s, y - 120 * s, x + 180 * s, y + 220 * s],
                fill=(col[0], col[1], col[2], 200), outline=(255, 255, 255, 220), width=8)
    d.line([(x, y - 120 * s), (x, y + 220 * s)], fill=(255, 255, 255, 230), width=12)
    d.rectangle([x - 160 * s, y - 200 * s, x + 160 * s, y - 100 * s],
                fill=(col[0], col[1], col[2], 230), outline=(255, 255, 255, 220), width=8)
    d.line([(x, y - 205 * s), (x, y - 95 * s)], fill=(255, 255, 255, 230), width=12)


def _motif_snowflake(im, d, x, y, col, a=200, s=1.0):
    for i in range(6):
        ang = math.radians(i * 60)
        d.line([(x, y), (x + 150 * s * math.cos(ang), y + 150 * s * math.sin(ang))],
               fill=(col[0], col[1], col[2], a), width=9)
        mx, my = x + 75 * s * math.cos(ang), y + 75 * s * math.sin(ang)
        d.line([(mx, my), (mx - 30 * s * math.cos(ang - 1.0), my - 30 * s * math.sin(ang - 1.0))],
               fill=(col[0], col[1], col[2], a), width=9)
        d.line([(mx, my), (mx - 30 * s * math.cos(ang + 1.0), my - 30 * s * math.sin(ang + 1.0))],
               fill=(col[0], col[1], col[2], a), width=9)


def _decorate_festival(im, d, accent_fg):
    if FEST == "diwali":
        _motif_rangoli(im, d, W // 2, 1840, accent_fg[0], r0=120, r1=460, petals=14)
        lantern_col = (255, 170, 60)
        for i, (dx, dy, s) in enumerate([(160, 260, 0.8), (920, 420, 0.7), (150, 1600, 0.9),
                                        (930, 1560, 0.85), (540, 640, 1.0)]):
            _motif_diya(im, d, dx, dy, s)
            _motif_lantern(im, d, 540, 240, (255, 205, 90) if i % 2 == 0 else lantern_col)
    elif FEST == "navratri":
        _motif_garbo(im, d, W // 2, H // 2, accent_fg[0])
        _motif_drum(im, d, 180, 1100, accent_fg[1])
        _motif_drum(im, d, 900, 1150, accent_fg[1])
        _motif_sparkle(im, d, 260, 320, (255, 255, 255), 180, 0.8)
        _motif_sparkle(im, d, 830, 300, (255, 255, 255), 180, 0.7)
    elif FEST == "holi":
        _draw_circles(im, d, accent_fg[0], 120, 22, 21)
        _draw_circles(im, d, accent_fg[1], 120, 18, 22)
        _draw_circles(im, d, (255, 255, 255), 90, 14, 23)
    elif FEST == "christmas":
        for dx, dy, s in [(150, 300, 0.9), (930, 380, 0.85), (200, 1560, 0.85), (900, 1500, 0.9)]:
            _motif_gift(im, d, dx, dy, accent_fg[0], s)
        for dx, dy, s in [(540, 230, 1.3), (120, 900, 0.8), (940, 840, 0.8)]:
            _motif_snowflake(im, d, dx, dy, (255, 255, 255), 170, s)
    elif FEST == "newyear":
        _motif_sparkle(im, d, 260, 320, (255, 255, 255), 200, 1.1)
        _motif_sparkle(im, d, 820, 360, (255, 255, 255), 200, 0.9)
        _motif_sparkle(im, d, 540, 1560, (255, 255, 255), 200, 1.3)
        _draw_circles(im, d, accent_fg[0], 130, 16, 24)


def _draw_center_subject(im, d, accent_fg, off=0):
    cx, cy = W // 2 + (off % 5 - 2) * 70, 950 + (off % 3 - 1) * 60
    if CAT in ("travel", "hillstation", "hill station", "nature", "mountains", "trekking", "hotel", "resort", "tourism"):
        _motif_mountain(im, d, 320, 1500, accent_fg[0], 0.9)
        _motif_mountain(im, d, 760, 1560, accent_fg[1], 0.7)
        _motif_sun(im, d, 540, 520, (255, 190, 90, 255), 160)
        _motif_cloud(im, d, 200, 700, (255, 255, 255), 150, 1.2)
        _motif_cloud(im, d, 880, 780, (255, 255, 255), 150, 1.0)
    elif CAT in ("food", "restaurant", "cafe", "pizza", "bakery", "hotel", "biryani", "catering"):
        _motif_pizza(im, d, cx, cy, 1.5)
        _motif_sparkle(im, d, 260, 700, (255, 255, 255), 160, 1.2)
        _motif_sparkle(im, d, 820, 700, (255, 255, 255), 160, 1.2)
    elif CAT in ("fashion", "clothing", "dress", "saree", "boutique", "ethnic", "lehenga"):
        _motif_dress(im, d, 380, cy, 1.2, accent_fg[0])
        _motif_dress(im, d, 700, cy + 30, 1.0, accent_fg[1])
        _motif_sparkle(im, d, 240, 640, (255, 255, 255), 180, 1.1)
        _motif_sparkle(im, d, 850, 620, (255, 255, 255), 160, 0.9)
    elif CAT in ("gym", "fitness", "workout", "yoga", "trainer"):
        _motif_dumbbell(im, d, cx, 980, 1.3, (235, 235, 245, 150))
        _glow(im, d, (cx - 340, 700, cx + 340, 1300), 500, (255, 120, 40), 30)
    elif CAT in ("beauty", "salon", "spa", "hair", "makeup", "nail", "parlour"):
        _motif_sparkle(im, d, 300, 700, (255, 255, 255), 190, 1.4)
        _motif_sparkle(im, d, 780, 1060, (255, 255, 255), 190, 1.4)
        _motif_sparkle(im, d, 330, 1280, (255, 255, 255), 170, 1.0)
        _motif_sparkle(im, d, 750, 700, (255, 255, 255), 170, 1.0)
        # mirror
        d.ellipse([cx - 180, 1300, cx + 180, 1660], outline=accent_fg[0] + (220,), width=14)
        d.polygon([(cx - 160, 1400), (cx, 1520), (cx + 160, 1400)], fill=(255, 255, 255, 120))
    elif CAT in ("tech", "mobile", "electronics", "gadget", "repair", "phone", "computer"):
        _motif_circuit(im, d, cx, cy, accent_fg[0])
    else:
        # generic abstract
        _draw_diagonal_rays(im, d, cx, cy, (255, 255, 255), 26)
        _draw_circles(im, d, (255, 255, 255), 90, 10, 31)


def make_scene(i):
    c0 = _hex(PAL[0])
    c1 = _hex(PAL[2] if len(PAL) > 2 else PAL[1])
    accent_fg = [_hex(ACCENT), _hex(PAL[1])]
    # alternate vertical / radial / diagonal base for variety
    if i % 3 == 0:
        base = _grad_bg(c0, c1, vertical=True)
        im = base.convert("RGBA")
        d = ImageDraw.Draw(im, "RGBA")
        _draw_diagonal_rays(im, d, W // 2, H // 2, (255, 255, 255), 22, 18)
    elif i % 3 == 1:
        im = _grad_bg(c0, c1, vertical=False).convert("RGBA")
        d = ImageDraw.Draw(im, "RGBA")
        _draw_circles(im, d, (255, 255, 255), 70, 9, 100 + i)
    else:
        im = _grad_bg(c0, c1, radial_center=(W // 2, H // 2)).convert("RGBA")
        d = ImageDraw.Draw(im, "RGBA")
        _draw_diagonal_rays(im, d, W // 2, H // 2, (255, 255, 255), 18, 14)

    _glow(im, d, (W // 2 - 500, 400, W // 2 + 500, 1400), 700, accent_fg[0], 20)
    _decorate_festival(im, d, accent_fg)
    _draw_center_subject(im, d, accent_fg, i)

    # subtle vignette for depth
    vign = Image.new("L", (W, H), 0)
    vd = ImageDraw.Draw(vign)
    vd.ellipse([-W // 2, -100, W + W // 2, H + 200], fill=255)
    vign = vign.filter(ImageFilter.GaussianBlur(180))
    dark = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dark.putalpha(vign.point(lambda v: int((255 - v) * 0.55)))
    im = Image.alpha_composite(im, dark)

    p = OUT.rstrip("\\/") + "\\" + "bg%d.png" % i
    im.convert("RGB").save(p, "PNG")
    return "bg%d.png" % i


def main():
    files = []
    for i in range(N):
        files.append(make_scene(i))
    print(json.dumps(files))


if __name__ == "__main__":
    main()
