import sys
import math
import json

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT_DIR = sys.argv[1] if len(sys.argv) > 1 else "."
ACCENT = sys.argv[2] if len(sys.argv) > 2 else "#FFD54F"
FONT_KIND = sys.argv[3] if len(sys.argv) > 3 else "impact"


def _font(size, kind=FONT_KIND):
    candidates = [
        r"C:\Windows\Fonts\impact.ttf" if kind == "impact" else r"C:\Windows\Fonts\Nirmala.ttf",
        r"C:\Windows\Fonts\arialbd.ttf",
    ]
    for c in candidates:
        try:
            return ImageFont.truetype(c, size)
        except Exception:
            pass
    return ImageFont.load_default()


def _hex(c):
    c = c.lstrip("#")
    if len(c) == 6:
        return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16))
    return (255, 213, 79)


def save(img, name):
    p = OUT_DIR.rstrip("\\/") + "\\" + name
    img.save(p, "PNG")
    return name


def make_burst(accent):
    W = 900
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = cy = W // 2
    ac = _hex(accent)
    # soft radial glow
    for r in range(300, 0, -1):
        a = int(52 * (1 - r / 300))
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, a))
    # sunburst rays
    rays = 36
    for i in range(rays):
        a0 = math.radians(i * 10)
        a1 = math.radians(i * 10 + 7)
        use_accent = i % 2 == 0
        col = (ac[0], ac[1], ac[2], 60) if use_accent else (255, 255, 255, 46)
        r_in = 120
        r_out = 445 if i % 2 else 430
        pts = [
            (cx + r_in * math.cos(a0), cy + r_in * math.sin(a0)),
            (cx + r_in * math.cos(a1), cy + r_in * math.sin(a1)),
            (cx + r_out * math.cos(a1), cy + r_out * math.sin(a1)),
            (cx + r_out * math.cos(a0), cy + r_out * math.sin(a0)),
        ]
        d.polygon(pts, fill=col)
    # bright core
    d.ellipse([cx - 60, cy - 60, cx + 60, cy + 60], fill=(255, 255, 255, 150))
    return save(img, "burst.png")


def make_spark1():
    W = 160
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = 80
    d.polygon([(c, 5), (c + 14, c), (c, 155), (c - 14, c)], fill=(255, 255, 255, 235))
    d.polygon([(5, c), (c, c - 14), (155, c), (c, c + 14)], fill=(255, 255, 255, 235))
    d.ellipse([c - 16, c - 16, c + 16, c + 16], fill=(255, 255, 255, 255))
    return save(img, "spark1.png")


def make_spark2(accent):
    W = 240
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = cy = W // 2
    ac = _hex(accent)
    for k, arm in enumerate([160, 115]):
        col = (255, 255, 255, 230) if k == 0 else (ac[0], ac[1], ac[2], 220)
        for rot in range(0, 4):
            ang = math.radians(rot * 90 + 45)
            # 4 thin petals
            a0 = ang - 0.12
            a1 = ang + 0.12
            pts = [
                (cx + 18 * math.cos(a0), cy + 18 * math.sin(a0)),
                (cx + arm * math.cos(ang), cy + arm * math.sin(ang)),
                (cx + 18 * math.cos(a1), cy + 18 * math.sin(a1)),
            ]
            d.polygon(pts, fill=col)
    return save(img, "spark2.png")


def make_hot():
    W, H = 380, 150
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, W - 1, H - 1], radius=52, fill=(255, 59, 48, 245), outline=(255, 255, 255, 120), width=3)
    f = _font(88)
    txt = "HOT"
    bb = d.textbbox((0, 0), txt, font=f)
    w = bb[2] - bb[0]
    h = bb[3] - bb[1]
    d.text(((W - w) / 2 - bb[0], (H - h) / 2 - bb[1]), txt, font=f, fill=(255, 255, 255, 255))
    return save(img, "hot.png")


def make_arrow():
    W = 260
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # vertical arrow pointing down, then rotate 45 (diagonal)
    def arrow_poly(cx, o=0):
        head = 60
        sh_x0 = cx - 22 - o
        sh_x1 = cx + 22 + o
        top = 14 - o
        bot = W - head - o
        base = W - head + 14 + o
        return [(sh_x0, top), (sh_x1, top), (sh_x1, bot),
                (cx + 44 + o, bot), (cx, W - 6 - o), (cx - 44 - o, bot), (sh_x0, bot)]
    d.polygon(arrow_poly(130, 7), fill=(0, 0, 0, 170))
    d.polygon(arrow_poly(130, 0), fill=(255, 213, 79, 255))
    img = img.rotate(45, expand=True, resample=Image.BICUBIC)
    return save(img, "arrow.png")


def make_visit(kind):
    W, H = 660, 200
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, W - 1, H - 1], radius=100, fill=(20, 20, 24, 235), outline=(255, 213, 79, 255), width=8)
    f = _font(76, kind)
    txt = "VISIT US" if kind == "impact" else "\u0906\u091c \u0906\u0913"  # "Aaj Aao"
    bb = d.textbbox((0, 0), txt, font=f)
    w = bb[2] - bb[0]
    h = bb[3] - bb[1]
    d.text(((W - w) / 2 - bb[0], (H - h) / 2 - bb[1]), txt, font=f, fill=(255, 255, 255, 255))
    return save(img, "visit.png")


def main():
    accent = ACCENT
    made = [make_burst(accent), make_spark1(), make_spark2(accent), make_hot(), make_arrow(), make_visit(FONT_KIND)]
    print(json.dumps(made))


if __name__ == "__main__":
    main()