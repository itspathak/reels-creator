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
  argv[8] = description       (free text used for AI-style category analysis)

Draws rich illustrated full-bleed 1080x1920 animated-feel backgrounds (one per
scene) with clearly business-specific hero visuals (cloth, spa, food, gym,
travel, jewellery, tech ...), decorative category patterns + festival motifs.
Prints JSON list of files.
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
DESC = sys.argv[8] if len(sys.argv) > 8 else ""

W, H = 1080, 1920

# Boosted colors: mix palette colors in (they come slightly washed).
def bright(c, f=0.25):
    r, g, b = _hex(c)
    return (min(255, int(r + (255 - r) * f)), min(255, int(g + (255 - g) * f)), min(255, int(b + (255 - b) * f)))


# ---- AI-style analysis: derive the visual category from business type + description ----
def _derive_category():
    text = (CAT + " " + DESC).lower()
    rules = [
        (["jeans", "shirt", "saree", "kurta", "lehenga", "ethnic", "cloth", "fabric", "dress", "boutique", "tailor", "garment", "fashion", "suit", "trouser", "dupatta", "dress material", "western wear", "tshirt", "t-shirt", "kurti", "denim", "apparel", "menswear", "womenswear", "kids wear", "sherwani", "chikan", "bandhgala", "suiting", "trousers", "shirts", "stitch"], "fashion"),
        (["jewellery", "jewel", "gold", "silver", "ring", "diamond", "earring", "necklace", "ornament", "kundan", "jhumka", "bangle", "chain", "zari", "studs", "diamonds"], "jewellery"),
        (["spa", "massage", "parlour", "facial", "skin", "glow", "makeover", "mehendi", "mehndi", "salon", "nail art", "wax", "haircut", "threading", "bleach", "tan", "bridal", "beauty", "mani", "pedi", "makeup", "lashes", "barber"], "beauty"),
        (["gym", "fitness", "workout", "yoga", "zumba", "trainer", "protein", "aerobics", "pilates", "crossfit", "boxing", "cardio", "strength", "muscle", "bodybuilding"], "gym"),
        (["mobile", "phone", "electronics", "gadget", "computer", "laptop", "repair", "accessories", "camera", "tech", "tv", "led", "sound", "speaker", "cctv", "printer", "smartwatch", "refurbished"], "tech"),
        (["real estate", "property", "flat", "builder", "builders", "home loans", "apartment", "villa", "plot", "land", "construction", "interior", "architecture"], "estate"),
        (["travel", "hill station", "hill", "nature", "mountain", "resort", "tour", "forest", "lake", "beach", "trek", "trekking", "valley", "homestay", "honeymoon", "vacation", "sightseeing", "adventure", "guesthouse", "cottage", "paragliding"], "travel"),
        (["pizza", "burger", "cake", "sweet", "mithai", "restaurant", "cafe", "bakery", "food", "snack", "biryani", "cater", "chocolate", "curry", "thali", "dosa", "chaat", "tandoor", "kebab", "samosa", "ice cream", "street food", "dinner", "lunch", "breakfast", "juice", "tiffin", "kitchen", "dhaba"], "food"),
    ]
    for kw, cat in rules:
        if any(k in text for k in kw):
            return cat
    if "hotel" in CAT or "resort" in CAT:
        return "travel"
    return CAT


CAT = _derive_category()


# ---- palette helpers ----
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


def _mixed(a, b, t=0.5):
    return tuple(int(a[k] + (b[k] - a[k]) * t) for k in range(3))


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


def _draw_circles(im, d, col, a, n=8, seed=1, rmax=260):
    rnd = random.Random(seed)
    for _ in range(n):
        x = rnd.randint(0, W)
        y = rnd.randint(0, H)
        r = rnd.randint(30, rmax)
        d.ellipse([x - r, y - r, x + r, y + r], outline=(col[0], col[1], col[2], a), width=8)


def _draw_dots(im, d, col, a, n=26, seed=5, r=14):
    rnd = random.Random(seed)
    rnd.seed(seed)
    for _ in range(n):
        x = rnd.randint(60, W - 60)
        y = rnd.randint(140, H - 260)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(col[0], col[1], col[2], a))


def _rounded_card(d, box, r=44, fill=None, outline=None, width=6):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)


# =====================================================================
# CATEGORY MOTIFS  (hero visuals — clearly identify the business)
# =====================================================================
def _motif_dress(im, d, x, y, col, s=1.0, dark=None):
    """A stylish frock/dress with waist and flare."""
    base = col
    d.polygon([(x, y - 260 * s), (x - 205 * s, y + 60 * s), (x - 120 * s, y + 150 * s),
               (x + 120 * s, y + 150 * s), (x + 205 * s, y + 60 * s)], fill=base + (235,))
    # waistband
    d.polygon([(x, y - 250 * s), (x - 195 * s, y + 50 * s), (x + 195 * s, y + 50 * s),
               (x, y - 205 * s)], fill=(255, 255, 255, 210))
    # neck/shoulders
    d.polygon([(x - 120 * s, y - 255 * s), (x, y - 130 * s), (x + 120 * s, y - 255 * s)],
              fill=base + (235,))
    # scoop neck
    d.arc([x - 95 * s, y - 260 * s, x + 95 * s, y - 150 * s], 180, 360, fill=(255, 255, 255, 200), width=10)
    # belt bow
    d.ellipse([x - 26 * s, y - 238 * s, x + 26 * s, y - 186 * s], fill=(255, 255, 255, 235))


def _motif_shirt(im, d, x, y, col, s=1.0):
    """A t-shirt."""
    c = col
    d.polygon([(x, y - 220 * s), (x - 190 * s, y - 20 * s), (x - 150 * s, y + 130 * s),
               (x + 150 * s, y + 130 * s), (x + 190 * s, y - 20 * s)], fill=c + (240,))
    # collar
    d.polygon([(x - 80 * s, y - 150 * s), (x, y - 90 * s), (x + 80 * s, y - 150 * s),
               (x, y - 180 * s)], fill=(255, 255, 255, 220))
    # short sleeves outline
    d.arc([x - 250 * s, y - 80 * s, x - 40 * s, y + 120 * s], 90, 250, fill=(0, 0, 0, 40), width=8)
    d.arc([x + 40 * s, y - 80 * s, x + 250 * s, y + 120 * s], -70, 90, fill=(0, 0, 0, 40), width=8)


def _motif_jeans(im, d, x, y, col, s=1.0):
    c = (70, 90, 170, 235)
    d.rounded_rectangle([x - 150 * s, y - 160 * s, x + 150 * s, y - 40 * s], radius=30, fill=c)  # waist
    d.polygon([(x - 130 * s, y - 80 * s), (x - 150 * s, y + 190 * s), (x - 40 * s, y + 190 * s),
               (x - 45 * s, y - 80 * s)], fill=c)  # left leg
    d.polygon([(x + 40 * s, y - 80 * s), (x + 45 * s, y + 190 * s), (x + 150 * s, y + 190 * s),
               (x + 130 * s, y - 80 * s)], fill=c)  # right leg
    # pockets
    d.arc([x - 110 * s, y - 110 * s, x - 10 * s, y + 20 * s], 180, 360, fill=(255, 255, 255, 130), width=7)
    d.arc([x + 10 * s, y - 110 * s, x + 110 * s, y + 20 * s], 180, 360, fill=(255, 255, 255, 130), width=7)
    # stitching
    d.line([(x, y - 150 * s), (x, y - 40 * s)], fill=(255, 220, 120, 220), width=6)


def _motif_hanger(im, d, x, y, col, s=1.0):
    c = col
    d.arc([x - 90 * s, y - 120 * s, x + 90 * s, y + 40 * s], 200, 340, fill=c + (235,), width=14)
    d.polygon([(x, y - 168 * s), (x - 14 * s, y - 120 * s), (x + 14 * s, y - 120 * s)], fill=c + (235,))
    d.line([(x - 90 * s, y + 40 * s), (x - 90 * s, y + 130 * s)], fill=c + (235,), width=12)
    d.line([(x + 90 * s, y + 40 * s), (x + 90 * s, y + 130 * s)], fill=c + (235,), width=12)


def _motif_saree(im, d, x, y, col, s=1.0):
    c = col
    # flowing drape
    d.polygon([(x - 200 * s, y - 260 * s), (x - 150 * s, y + 210 * s), (x + 240 * s, y + 210 * s),
               (x + 280 * s, y - 180 * s)], fill=c + (225,))
    # pallu line
    d.polygon([(x + 210 * s, y - 230 * s), (x + 185 * s, y + 180 * s), (x + 250 * s, y + 190 * s),
               (x + 275 * s, y - 180 * s)], fill=(255, 255, 255, 170))
    # blouse hint
    d.polygon([(x - 170 * s, y - 120 * s), (x - 60 * s, y - 60 * s), (x - 10 * s, y - 120 * s),
               (x - 90 * s, y - 255 * s)], fill=(255, 255, 255, 190))
    d.ellipse([x - 200 * s, y - 90 * s, x - 120 * s, y + 40 * s], fill=(255, 255, 255, 80))


def _motif_lotus(im, d, x, y, col, a=160, s=1.0):
    for k in range(6):
        ang = math.radians(k * 60 - 90)
        bx = x + 170 * s * math.cos(ang)
        by = y + 170 * s * math.sin(ang)
        pts = [(x, y), (x + 68 * s * math.cos(ang - 0.5), y + 68 * s * math.sin(ang - 0.5)),
               (bx, by), (x + 68 * s * math.cos(ang + 0.5), y + 68 * s * math.sin(ang + 0.5))]
        d.polygon(pts, fill=col + (a,))
    d.ellipse([x - 60 * s, y - 36 * s, x + 60 * s, y + 60 * s], fill=(255, 220, 150, 200))


def _motif_candle(im, d, x, y, col, s=1.0):
    d.rounded_rectangle([x - 55 * s, y - 30 * s, x + 55 * s, y + 170 * s], radius=26, fill=col + (230,))
    d.polygon([(x, y - 60 * s), (x - 16 * s, y - 5 * s), (x + 16 * s, y - 5 * s)], fill=(255, 190, 80, 230))
    d.ellipse([x - 40 * s, y - 44 * s, x + 40 * s, y + 34 * s], fill=(255, 150, 40, 230))
    # steam
    for i in range(3):
        sx = x - 30 * s + i * 30 * s
        d.arc([sx - 26, y - 120 * s - i * 28, sx + 26, y - 40 * s - i * 28], 0, 360, fill=(255, 255, 255, 90), width=6)


def _motif_leaf(im, d, x, y, col, s=1.0):
    d.polygon([(x, y - 40 * s), (x - 150 * s, y - 100 * s), (x - 150 * s, y + 30 * s)],
              fill=(120, 200, 120, 170))
    d.arc([x - 150 * s - 10, y - 100 * s - 10, x + 10, y + 30 * s + 10], 0, 90, fill=(255, 255, 255, 130), width=6)
    d.line([(x, y - 40 * s), (x - 150 * s, y - 35 * s)], fill=(60, 140, 60, 200), width=6)


def _motif_massage(im, d, x, y, col, s=1.0):
    # a hand-and-spa-swell composition: rounded pebbles + small bloom
    d.ellipse([x - 150 * s, y - 140 * s, x + 150 * s, y + 160 * s], outline=col + (220,), width=12)
    d.ellipse([x - 90 * s, y - 80 * s, x + 60 * s, y + 120 * s], fill=(255, 255, 255, 60), outline=col + (200,), width=8)
    _motif_lotus(im, d, x + 18 * s, y - 8 * s, (255, 255, 255), 140, 0.5)
    d.ellipse([x - 160 * s, y + 100 * s, x + 160 * s, y + 160 * s], fill=col + (140,))


def _motif_pizza(im, d, x, y, s=1.0):
    crust = (230, 160, 50, 255)
    cheese = (250, 205, 90, 255)
    d.polygon([(x, y - 260 * s), (x - 300 * s, y + 150 * s), (x + 300 * s, y + 150 * s)], fill=crust)
    d.polygon([(x, y - 220 * s), (x - 250 * s, y + 130 * s), (x + 250 * s, y + 130 * s)], fill=cheese)
    for off in [(0, 0, 70), (-110, 90, 55), (110, 90, 55), (-60, 150, 40), (60, 150, 40)]:
        d.ellipse([x + off[0] - 34, y + off[1] - 34, x + off[0] + 34, y + off[1] + 34],
                  fill=(190, 30, 30, 255))
    d.arc([x - 230 * s, y - 200 * s, x + 210 * s, y + 160 * s], 0, 360, fill=(255, 255, 255, 120), width=10)


def _motif_burger(im, d, x, y, s=1.0):
    d.polygon([(x - 230 * s, y - 180 * s), (x + 230 * s, y - 180 * s), (x + 200 * s, y - 90 * s),
               (x - 200 * s, y - 90 * s)], fill=(235, 170, 50, 255))
    for i in range(5):  # sesame
        d.ellipse([x - 140 * s + i * 60 * s, y - 168 * s, x - 130 * s + i * 60 * s, y - 152 * s],
                  fill=(255, 240, 190, 255))
    d.rounded_rectangle([x - 230 * s, y - 90 * s, x + 230 * s, y - 20 * s], radius=16, fill=(220, 80, 60, 255))
    d.rounded_rectangle([x - 220 * s, y - 20 * s, x + 220 * s, y + 30 * s], radius=8, fill=(180, 220, 90, 255))
    d.rounded_rectangle([x - 230 * s, y + 30 * s, x + 230 * s, y + 160 * s], radius=20, fill=(235, 170, 50, 255))


def _motif_coffee(im, d, x, y, col, s=1.0):
    d.arc([x - 80 * s, y - 110 * s, x + 80 * s, y + 110 * s], 200, 340, fill=(255, 255, 255, 240), width=22)
    d.rounded_rectangle([x - 90 * s, y - 90 * s, x + 30 * s, y + 100 * s], radius=18, fill=(255, 255, 255, 240))
    d.ellipse([x - 72 * s, y - 72 * s, x + 12 * s, y + 12 * s], fill=(150, 100, 60, 190))
    for i in range(3):  # steam
        sx = x - 30 * s + i * 34 * s
        d.arc([sx - 20, y - 170 * s - i * 20, sx + 20, y - 80 * s - i * 20], 0, 360, fill=(255, 255, 255, 110), width=7)


def _motif_food(im, d, x, y, col, s=1.0):  # generic mini plate
    d.ellipse([x - 130 * s, y - 55 * s, x + 130 * s, y + 55 * s], outline=col + (230,), width=10)
    d.ellipse([x - 95 * s, y - 30 * s, x + 95 * s, y + 30 * s], fill=col + (130,))


def _motif_dumbbell(im, d, x, y, s=1.0, col=None):
    c = col or (235, 235, 245, 150)
    d.rounded_rectangle([x - 14 * s, y - 210 * s, x + 14 * s, y + 210 * s], radius=10, fill=c)
    for wi, woff in [(70, 250), (70, 190), (44, 40), (44, -40), (70, -190), (70, -250)]:
        d.rounded_rectangle([x - 14 * s, y - woff - wi * s, x + 14 * s, y - woff + wi * s], radius=12, fill=c)


def _motif_runshoe(im, d, x, y, col, s=1.0):
    c = col
    d.polygon([(x - 170 * s, y), (x + 10 * s, y - 70 * s), (x + 170 * s, y - 40 * s),
               (x + 230 * s, y + 40 * s), (x - 120 * s, y + 120 * s)], fill=c + (230,))
    # sole
    d.polygon([(x - 140 * s, y + 100 * s), (x + 210 * s, y + 20 * s), (x + 235 * s, y + 75 * s),
               (x - 100 * s, y + 135 * s)], fill=(255, 255, 255, 180))
    # laces
    d.line([(x - 40 * s, y - 30 * s), (x + 40 * s, y - 45 * s)], fill=(255, 255, 255, 220), width=7)
    d.line([(x - 20 * s, y - 5 * s), (x + 60 * s, y - 20 * s)], fill=(255, 255, 255, 200), width=7)


def _motif_phone(im, d, x, y, col, s=1.0):
    c = col
    d.rounded_rectangle([x - 90 * s, y - 190 * s, x + 90 * s, y + 190 * s], radius=40, fill=(20, 24, 34, 245))
    d.rounded_rectangle([x - 72 * s, y - 160 * s, x + 72 * s, y + 170 * s], radius=26, fill=(235, 240, 255, 245))
    d.rounded_rectangle([x - 60 * s, y - 145 * s, x + 60 * s, y - 100 * s], radius=14, fill=(90, 150, 255, 255))
    for i in range(4):
        d.rounded_rectangle([x - 60 * s, y - 70 * s + i * 42 * s, x + 60 * s, y - 48 * s + i * 42 * s],
                            radius=10, fill=(190, 200, 220, 160))
    d.ellipse([x - 16 * s, y + 160 * s, x + 16 * s, y + 180 * s], fill=c + (230,))


def _motif_wifi(im, d, x, y, col, a=180, s=1.0):
    for i in range(3):
        r = 42 + i * 36
        d.arc([x - r * s, y - r * s, x + r * s, y + r * s], 200, 340, fill=col + (a,), width=10)


def _motif_circuit(im, d, x, y, col, a=150, s=1.0):
    for i in range(6):
        ang = math.radians(i * 60)
        d.line([(x, y), (x + 420 * s * math.cos(ang), y + 420 * s * math.sin(ang))],
               fill=(col[0], col[1], col[2], a), width=10)
        ex = x + 420 * s * math.cos(ang)
        ey = y + 420 * s * math.sin(ang)
        d.ellipse([ex - 34, ey - 34, ex + 34, ey + 34], fill=(col[0], col[1], col[2], a + 40))
    d.ellipse([x - 90, y - 90, x + 90, y + 90], fill=(255, 255, 255, 230))


def _motif_ring(im, d, x, y, col, s=1.0):
    d.ellipse([x - 120 * s, y - 120 * s, x + 120 * s, y + 120 * s], outline=(255, 230, 150, 255), width=18)
    d.polygon([(x, y - 60 * s), (x - 46 * s, y - 120 * s), (x + 46 * s, y - 120 * s)], fill=(255, 255, 255, 240))
    d.polygon([(x, y - 60 * s), (x - 28 * s, y - 116 * s), (x + 28 * s, y - 116 * s)], fill=(200, 240, 255, 255))
    d.ellipse([x - 150 * s, y - 60 * s, x + 150 * s, y + 70 * s], outline=(235, 220, 150, 220), width=12)


def _motif_earring(im, d, x, y, col, s=1.0):
    d.ellipse([x - 60 * s, y - 80 * s, x + 60 * s, y + 40 * s], outline=col + (240,), width=14)
    d.line([(x, y - 150 * s), (x, y - 80 * s)], fill=col + (240,), width=8)
    d.ellipse([x - 18 * s, y - 170 * s, x + 18 * s, y - 134 * s], fill=(255, 230, 150, 240))


def _motif_plain(im, d, x, y, col, s=1.0):  # paper plane
    d.polygon([(x, y - 60 * s), (x - 150 * s, y + 20 * s), (x, y), (x + 150 * s, y + 20 * s)],
              fill=(255, 255, 255, 200))
    d.line([(x, y), (x, y + 90 * s)], fill=(255, 255, 255, 170), width=5)
    d.polygon([(x, y), (x + 60 * s, y + 110 * s), (x + 20 * s, y + 120 * s)], fill=(255, 255, 255, 130))


def _motif_buildings(im, d, x, y, col, s=1.0):
    c = col
    for i, w in enumerate([140, 190, 120]):
        bx = x - 180 * s + i * 130 * s
        d.rounded_rectangle([bx, y - 260 * s, bx + w * s, y], radius=12, fill=c + (140,))
        for wy in range(-220, -20, 44):
            d.rounded_rectangle([bx + 16 * s, y + wy * s, bx + w * s - 16 * s, y + wy * s + 26 * s],
                                radius=8, fill=(255, 255, 255, 90))


def _motif_mountain(im, d, x, y, col, s=1.0):
    d.polygon([(x - 260 * s, y), (x, y - 280 * s), (x + 260 * s, y)], fill=col + (110,))
    d.polygon([(x - 60 * s, y), (x + 140 * s, y - 170 * s), (x + 340 * s, y)], fill=(255, 255, 255, 90))
    wx = x - 60 * s
    d.polygon([(wx - 22, y - 140 * s), (wx - 6, y - 70 * s), (wx + 22, y - 120 * s), (wx + 40, y - 40 * s), (wx + 8, y - 10 * s)],
              fill=(255, 255, 255, 210))
    crop = 160
    d.polygon([(wx - 22, y - 140 * s), (wx + 40, y - 40 * s), (wx + 8, y - 10 * s),
               (wx - crop, y - 2 * s), (wx - crop, y - 200 * s)], fill=(255, 255, 255, 210))


def _motif_cloud(im, d, x, y, col, a=160, s=1.0):
    d.ellipse([x - 150 * s, y - 45 * s, x + 150 * s, y + 45 * s], fill=col + (a,))
    d.ellipse([x - 80 * s, y - 90 * s, x + 60 * s, y + 15 * s], fill=col + (a,))
    d.ellipse([x + 30 * s, y - 70 * s, x + 150 * s, y + 20 * s], fill=col + (a,))


def _motif_sun(im, d, x, y, col=(255, 170, 60, 255), r=120):
    _glow(im, d, (x - r, y - r, x + r, y + r), 260, col[:3], 40)
    d.ellipse([x - r, y - r, x + r, y + r], fill=col)


def _motif_sparkle(im, d, x, y, col, a=220, s=1.0):
    d.polygon([(x, y - 90 * s), (x + 22 * s, y), (x, y + 90 * s), (x - 22 * s, y)], fill=col + (a,))
    d.polygon([(x - 90 * s, y), (x, y - 22 * s), (x + 90 * s, y), (x, y + 22 * s)], fill=col + (a,))
    d.ellipse([x - 30 * s, y - 30 * s, x + 30 * s, y + 30 * s], fill=(255, 255, 255, 230))


# ---- festival motifs ----
def _motif_diya(im, d, x, y, s=1.0, accent=None):
    d.polygon([(x - 60 * s, y), (x + 60 * s, y), (x, y - 90 * s)], fill=(200, 120, 20, 255))
    d.polygon([(x - 40 * s, y), (x + 40 * s, y), (x, y - 60 * s)], fill=(245, 170, 30, 255))
    d.ellipse([x - 16 * s, y - 150 * s, x + 16 * s, y - 70 * s], fill=(250, 120, 30, 255))
    d.ellipse([x - 9 * s, y - 132 * s, x + 9 * s, y - 100 * s], fill=(255, 220, 120, 255))


def _motif_rangoli(im, d, cx, cy, col, r0=120, r1=420, petals=12, a=120):
    for k in range(petals):
        ang = math.radians(k * (360 / petals))
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
        d.ellipse([x - 66, y - 66, x + 66, y + 66], fill=(col[0], col[1], col[2], a), width=14)
    d.ellipse([cx - (r + 80), cy - (r + 80), cx + (r + 80), cy + (r + 80)],
              outline=(255, 255, 255, 80), width=10)


def _motif_drum(im, d, x, y, col, s=1.0):
    d.rounded_rectangle([x - 150 * s, y - 250 * s, x + 150 * s, y + 250 * s],
                        radius=80, outline=(col[0], col[1], col[2], 220), width=10,
                        fill=(col[0], col[1], col[2], 60))
    d.line([(x - 150 * s, y - 80 * s), (x + 150 * s, y - 80 * s)],
           fill=(col[0], col[1], col[2], 200), width=10)


def _motif_gift(im, d, x, y, col, s=1.0):
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
        _motif_rangoli(im, d, W // 2, 1830, accent_fg[0], r0=120, r1=430, petals=14)
        lantern_col = (255, 170, 60)
        for dx, dy, s in [(160, 240, 0.8), (920, 400, 0.7), (150, 1640, 0.85), (930, 1600, 0.8), (540, 620, 1.0)]:
            _motif_diya(im, d, dx, dy, s)
        _motif_lantern(im, d, 540, 200, (255, 205, 90))
    elif FEST == "navratri":
        _motif_garbo(im, d, W // 2, H // 2, accent_fg[0])
        _motif_drum(im, d, 180, 1080, accent_fg[1])
        _motif_drum(im, d, 900, 1130, accent_fg[1])
    elif FEST == "holi":
        _draw_circles(im, d, accent_fg[0], 120, 22, 21, 200)
        _draw_circles(im, d, accent_fg[1], 120, 18, 22, 200)
        _draw_circles(im, d, (255, 255, 255), 90, 14, 23, 150)
    elif FEST == "christmas":
        for dx, dy, s in [(150, 280, 0.9), (930, 360, 0.85), (200, 1560, 0.85), (900, 1500, 0.9)]:
            _motif_gift(im, d, dx, dy, accent_fg[0], s)
        for dx, dy, s in [(540, 210, 1.3), (120, 880, 0.8), (940, 820, 0.8)]:
            _motif_snowflake(im, d, dx, dy, (255, 255, 255), 170, s)
    elif FEST == "newyear":
        _motif_sparkle(im, d, 260, 300, (255, 255, 255), 200, 1.1)
        _motif_sparkle(im, d, 820, 340, (255, 255, 255), 200, 0.9)
        _motif_sparkle(im, d, 540, 1560, (255, 255, 255), 200, 1.3)
        _draw_circles(im, d, accent_fg[0], 130, 16, 24, 210)


# =====================================================================
# Per-scene composition
# =====================================================================
def _floaters(im, d, accent_fg, i):
    """Category-specific scattered icons (wallpaper feel)."""
    rnd = random.Random(40 + i)
    n = 8
    for k in range(n):
        x = rnd.randint(90, W - 90)
        y = rnd.randint(150, H - 250)
        sc = rnd.choice([0.30, 0.42, 0.30, 0.24])
        off = rnd.randint(0, 9)
        cA = accent_fg[0]
        cB = accent_fg[1]
        w = (255, 255, 255)
        if CAT == "fashion":
            pick = [_motif_dress, _motif_shirt, _motif_hanger][off % 3]
            col = [cA, cB, w][off % 3]
            pick(im, d, x, y, col, sc)
        elif CAT == "beauty":
            pick = [_motif_lotus, _motif_sparkle, _motif_leaf][off % 3]
            if pick is _motif_leaf:
                pick(im, d, x, y, (190, 235, 190), sc)
            else:
                pick(im, d, x, y, (255, 255, 255), 140, sc)
        elif CAT == "food":
            pick = [_motif_pizza, _motif_burger, _motif_coffee][off % 3]
            pick(im, d, x, y, sc)
        elif CAT == "gym":
            pick = [_motif_dumbbell, _motif_runshoe][off % 2]
            if pick is _motif_dumbbell:
                pick(im, d, x, y, sc, (235, 235, 245, 120))
            else:
                pick(im, d, x, y, (235, 235, 245), sc)
        elif CAT == "tech":
            pick = [_motif_phone, _motif_circuit, _motif_wifi][off % 3]
            if pick is _motif_phone:
                pick(im, d, x, y, cB, sc)
            elif pick is _motif_circuit:
                pick(im, d, x, y, (160, 220, 255), 130, sc)
            else:
                pick(im, d, x, y, (160, 220, 255), 180, sc)
        elif CAT == "travel":
            pick = [_motif_cloud, _motif_sparkle][off % 2]
            if pick is _motif_cloud:
                pick(im, d, x, y, w, 150, sc)
            else:
                pick(im, d, x, y, w, 180, sc)
        elif CAT == "jewellery":
            pick = [_motif_ring, _motif_earring, _motif_sparkle][off % 3]
            if pick is _motif_sparkle:
                pick(im, d, x, y, w, 190, sc)
            else:
                pick(im, d, x, y, (255, 220, 160), sc)
        else:
            _motif_sparkle(im, d, x, y, w, 160, sc)


def _draw_hero(im, d, i):
    """A big centered glowing panel with the business-specific hero visual."""
    cx = W // 2 + (i % 3 - 1) * 40
    cy = 940 + (i % 2) * 50
    accent_h = bright(ACCENT, 0.55)
    accent2 = _hex(PAL[1])
    white = (255, 255, 255)

    # soft hero glow
    _glow(im, d, (cx - 430, cy - 380, cx + 430, cy + 340), 760, (255, 255, 255), 26)
    # rounded hero card
    _rounded_card(d, (cx - 360, cy - 300, cx + 360, cy + 300), r=60,
                  fill=(255, 255, 255, 46), outline=(255, 255, 255, 110), width=5)
    # inner dashed-ish ring hint
    d.rounded_rectangle([cx - 330, cy - 270, cx + 330, cy + 270], radius=48,
                        outline=(255, 255, 255, 60), width=3)

    s = 1.0
    if CAT == "fashion":
        _motif_saree(im, d, cx - 170, cy + 10, accent2, 0.85)
        _motif_dress(im, d, cx + 150, cy + 20, (230, 120, 190), 0.95)
        _motif_hanger(im, d, cx - 300, cy - 200, accent_h, 0.5)
        _motif_shirt(im, d, cx + 290, cy - 60, (120, 190, 230), 0.6)
    elif CAT == "beauty":
        _motif_massage(im, d, cx + 60, cy + 20, accent2, 1.0)
        _motif_candle(im, d, cx - 230, cy + 40, (255, 190, 150), 0.75)
        _motif_lotus(im, d, cx + 300, cy - 80, (255, 210, 190), 150, 0.7)
        _motif_leaf(im, d, cx - 320, cy - 170, (140, 210, 140), 0.9)
        _motif_sparkle(im, d, cx - 260, cy - 220, (255, 255, 255), 200, 1.0)
    elif CAT == "food":
        _motif_pizza(im, d, cx - 190, cy + 20, 1.15)
        _motif_burger(im, d, cx + 150, cy + 60, 0.85)
        _motif_coffee(im, d, cx - 330, cy - 110, (255, 255, 255), 0.7)
    elif CAT == "gym":
        _motif_dumbbell(im, d, cx - 150, cy - 20, 1.1, (235, 235, 245, 210))
        _motif_runshoe(im, d, cx + 170, cy + 80, (255, 255, 255), 0.9)
        _motif_sparkle(im, d, cx - 300, cy - 180, (255, 200, 90), 210, 1.2)
    elif CAT == "tech":
        _motif_phone(im, d, cx, cy + 10, accent2, 1.15)
        _motif_wifi(im, d, cx - 250, cy - 160, (120, 220, 255), 200, 0.9)
        _motif_circuit(im, d, cx + 280, cy - 120, (120, 220, 255), 130, 0.5)
    elif CAT == "travel":
        _motif_mountain(im, d, cx + 30, cy + 260, accent2, 1.2)
        _motif_sun(im, d, cx - 220, cy - 180, (255, 190, 90, 255), 140)
        _motif_cloud(im, d, cx + 260, cy - 200, (255, 255, 255), 170, 1.1)
        _motif_plain(im, d, cx + 320, cy - 60, (255, 255, 255), 0.9)
    elif CAT == "jewellery":
        _motif_ring(im, d, cx - 160, cy + 10, (255, 230, 150), 1.1)
        _motif_earring(im, d, cx + 180, cy + 10, (255, 210, 160), 1.0)
        _motif_sparkle(im, d, cx + 300, cy - 150, (255, 255, 255), 230, 1.2)
        _motif_sparkle(im, d, cx - 320, cy + 150, (255, 255, 255), 200, 0.9)
    elif CAT == "estate":
        _motif_buildings(im, d, cx, cy + 130, accent2, 1.1)
        _motif_sun(im, d, cx + 260, cy - 190, (255, 220, 130, 255), 110)
        _motif_cloud(im, d, cx - 280, cy - 160, (255, 255, 255), 150, 0.8)
    else:
        _draw_diagonal_rays(im, d, cx, cy, (255, 255, 255), 26, 16)
        _draw_circles(im, d, (255, 255, 255), 80, 9, 100 + i, 320)
        _motif_sparkle(im, d, cx - 260, cy - 200, (255, 255, 255), 200, 1.1)
        _motif_sparkle(im, d, cx + 280, cy + 180, (255, 255, 255), 180, 0.9)


def _bottom_band(im, d, accent_fg, i):
    """A playful bottom strip (like a shop counter) in category accent."""
    y0 = 1720
    col = accent_fg[i % 2]
    d.rounded_rectangle([-40, y0 - 60, W + 40, y0 + 240], radius=60, fill=col + (70,))
    d.rounded_rectangle([-40, y0 - 60, W + 40, y0 - 12], radius=24, fill=(255, 255, 255, 90))
    rnd = random.Random(i)
    for k in range(9):
        x = 60 + k * 115 + rnd.randint(-14, 14)
        yy = y0 + 40 + rnd.randint(0, 110)
        r = rnd.randint(26, 46)
        d.ellipse([x - r, yy - r, x + r, yy + r], fill=(255, 255, 255, 55))


def make_scene(i):
    c0 = _hex(PAL[0])
    c1 = _hex(PAL[2] if len(PAL) > 2 else PAL[1])
    accent_fg = [bright(ACCENT), _hex(PAL[1])]
    if i % 3 == 0:
        base = _grad_bg(c0, c1, vertical=True)
        im = base.convert("RGBA")
        d = ImageDraw.Draw(im, "RGBA")
        _draw_diagonal_rays(im, d, W // 2, H // 2, (255, 255, 255), 20, 18)
    elif i % 3 == 1:
        im = _grad_bg(c0, c1, vertical=False).convert("RGBA")
        d = ImageDraw.Draw(im, "RGBA")
        _draw_circles(im, d, (255, 255, 255), 60, 8, 100 + i, 300)
    else:
        im = _grad_bg(c0, c1, radial_center=(W // 2, H // 2)).convert("RGBA")
        d = ImageDraw.Draw(im, "RGBA")
        _draw_diagonal_rays(im, d, W // 2, H // 2, (255, 255, 255), 16, 12)

    _draw_dots(im, d, accent_fg[0], 70, 24, 9 + i, 12)
    _floaters(im, d, accent_fg, i)
    _draw_hero(im, d, i)
    _decorate_festival(im, d, accent_fg)
    _bottom_band(im, d, accent_fg, i)

    # subtle vignette for depth
    vign = Image.new("L", (W, H), 0)
    vd = ImageDraw.Draw(vign)
    vd.ellipse([-W // 2, -100, W + W // 2, H + 200], fill=255)
    vign = vign.filter(ImageFilter.GaussianBlur(180))
    dark = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dark.putalpha(vign.point(lambda v: int((255 - v) * 0.5)))
    im = Image.alpha_composite(im, dark)

    p = OUT.rstrip("\\/") + "\\" + "bg%d.png" % i
    im.convert("RGB").save(p, "PNG")
    return "bg%d.png" % i


def main():
    files = []
    print("category=" + CAT, file=sys.stderr)
    for i in range(N):
        files.append(make_scene(i))
    print(json.dumps(files))


if __name__ == "__main__":
    main()