import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ICONS_DIR = Path(__file__).resolve().parent.parent / "frontend" / "public" / "icons"
ICONS_DIR.mkdir(parents=True, exist_ok=True)

NAVY = (11, 25, 44)       # #0B192C
TEAL = (0, 129, 112)      # #008170
WHITE = (255, 255, 255)
LIGHT_BG = (248, 250, 252)# #F8FAFC
CRIMSON = (220, 38, 38)

def draw_shield_logo(draw: ImageDraw.ImageDraw, cx: int, cy: int, size: int):
    """Draws an authoritative community shield with map pin and check symbol."""
    w = size // 2
    h = int(size * 0.6)
    
    # Shield polygon
    top = cy - h // 2
    bottom = cy + h // 2
    left = cx - w // 2
    right = cx + w // 2
    mid_y = top + int(h * 0.55)
    
    shield_pts = [
        (left, top),
        (right, top),
        (right, mid_y),
        (cx, bottom),
        (left, mid_y)
    ]
    draw.polygon(shield_pts, fill=NAVY, outline=TEAL, width=max(2, size // 30))
    
    # Inner pin symbol
    pin_r = size // 6
    pin_cy = cy - size // 14
    draw.ellipse([cx - pin_r, pin_cy - pin_r, cx + pin_r, pin_cy + pin_r], fill=TEAL)
    draw.polygon([(cx - pin_r, pin_cy), (cx + pin_r, pin_cy), (cx, pin_cy + pin_r * 2)], fill=TEAL)
    draw.ellipse([cx - pin_r // 2, pin_cy - pin_r // 2, cx + pin_r // 2, pin_cy + pin_r // 2], fill=WHITE)

def make_icon(size: int, is_maskable: bool = False) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0) if not is_maskable else NAVY)
    draw = ImageDraw.Draw(img)
    
    if not is_maskable:
        # Rounded background
        radius = int(size * 0.22)
        draw.rounded_rectangle([0, 0, size, size], radius=radius, fill=NAVY)
    
    logo_size = int(size * 0.65) if not is_maskable else int(size * 0.5)
    draw_shield_logo(draw, size // 2, size // 2, logo_size)
    return img

def make_splash() -> Image.Image:
    w, h = 1080, 1920
    img = Image.new("RGBA", (w, h), NAVY)
    draw = ImageDraw.Draw(img)
    
    # Centered big logo
    draw_shield_logo(draw, w // 2, h // 2 - 150, 420)
    
    # Simple accent bar
    draw.rectangle([w // 2 - 80, h // 2 + 180, w // 2 + 80, h // 2 + 190], fill=TEAL)
    return img

def generate_svgs():
    svg_logo = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B192C"/>
      <stop offset="100%" stop-color="#1E3E62"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="20" fill="url(#shieldGrad)"/>
  <path d="M 25 25 L 75 25 L 75 55 Q 75 75 50 85 Q 25 75 25 55 Z" fill="#008170" stroke="#FFFFFF" stroke-width="2"/>
  <circle cx="50" cy="45" r="10" fill="#FFFFFF"/>
  <path d="M 40 45 L 60 45 L 50 65 Z" fill="#FFFFFF"/>
  <circle cx="50" cy="45" r="5" fill="#008170"/>
</svg>"""

    svg_wordmark = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 70" width="340" height="70">
  <rect x="5" y="10" width="50" height="50" rx="10" fill="#0B192C"/>
  <path d="M 18 22 L 42 22 L 42 38 Q 42 50 30 55 Q 18 50 18 38 Z" fill="#008170"/>
  <circle cx="30" cy="32" r="3" fill="#FFFFFF"/>
  <text x="68" y="36" font-family="Inter, sans-serif" font-weight="700" font-size="18" fill="#0B192C">Community Scam Map</text>
  <text x="68" y="52" font-family="'Noto Sans Devanagari', sans-serif" font-weight="500" font-size="12" fill="#008170">कम्युनिटी स्कैम मैप • Verified Neighborhood Trust</text>
</svg>"""

    with open(ICONS_DIR / "logo.svg", "w", encoding="utf-8") as f:
        f.write(svg_logo)
    with open(ICONS_DIR / "logo-wordmark.svg", "w", encoding="utf-8") as f:
        f.write(svg_wordmark)

if __name__ == "__main__":
    icon_192 = make_icon(192)
    icon_192.save(ICONS_DIR / "icon-192.png")
    
    icon_512 = make_icon(512)
    icon_512.save(ICONS_DIR / "icon-512.png")
    
    icon_maskable = make_icon(512, is_maskable=True)
    icon_maskable.save(ICONS_DIR / "icon-maskable-512.png")
    
    splash = make_splash()
    splash.save(ICONS_DIR / "splash.png")
    
    generate_svgs()
    print(f"[+] All icons and assets generated in {ICONS_DIR}")
