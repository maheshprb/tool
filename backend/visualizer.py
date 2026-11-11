import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np

PREVIEWS_DIR = Path(__file__).parent.parent / "media_storage" / "previews"
PREVIEWS_DIR.mkdir(parents=True, exist_ok=True)

THEMES = {
    "midnight": {
        "name": "Midnight Obsidian",
        "bg_top": (11, 12, 16),
        "bg_bottom": (20, 24, 34),
        "accent": (230, 198, 135),  # Champagne gold
        "text_primary": (250, 250, 250),
        "text_secondary": (160, 165, 180)
    },
    "sunset": {
        "name": "Warm Sunset",
        "bg_top": (38, 18, 30),
        "bg_bottom": (82, 41, 46),
        "accent": (245, 158, 11),  # Amber
        "text_primary": (255, 250, 240),
        "text_secondary": (214, 180, 185)
    },
    "emerald": {
        "name": "Emerald Velvet",
        "bg_top": (9, 28, 22),
        "bg_bottom": (18, 48, 38),
        "accent": (110, 231, 183),  # Mint emerald
        "text_primary": (240, 253, 244),
        "text_secondary": (150, 190, 170)
    },
    "sapphire": {
        "name": "Deep Sapphire",
        "bg_top": (8, 18, 38),
        "bg_bottom": (16, 34, 68),
        "accent": (96, 165, 250),  # Sky blue
        "text_primary": (245, 248, 255),
        "text_secondary": (148, 163, 184)
    },
    "noir": {
        "name": "Silk Graphite",
        "bg_top": (18, 18, 20),
        "bg_bottom": (30, 31, 35),
        "accent": (212, 212, 216),  # Platinum
        "text_primary": (255, 255, 255),
        "text_secondary": (161, 161, 170)
    }
}

ASPECT_RATIOS = {
    "16:9": (1920, 1080),
    "9:16": (1080, 1920),
    "1:1": (1080, 1080)
}

def create_gradient_canvas(width: int, height: int, color_top: tuple, color_bottom: tuple) -> Image.Image:
    """Create a high quality vertical gradient canvas."""
    base = Image.new("RGB", (width, height), color_top)
    top_r, top_g, top_b = color_top
    bot_r, bot_g, bot_b = color_bottom
    
    # Generate smooth gradient using numpy
    gradient = np.zeros((height, width, 3), dtype=np.uint8)
    for y in range(height):
        factor = y / float(height - 1)
        r = int(top_r + (bot_r - top_r) * factor)
        g = int(top_g + (bot_g - top_g) * factor)
        b = int(top_b + (bot_b - top_b) * factor)
        gradient[y, :, :] = [r, g, b]
        
    return Image.fromarray(gradient)

def draw_vinyl_graphic(draw: ImageDraw.ImageDraw, center_x: int, center_y: int, radius: int, accent_color: tuple):
    """Draw an elegant minimalist vinyl disc and sound ring."""
    # Outer disc
    disc_color = (24, 26, 32)
    draw.ellipse([center_x - radius, center_y - radius, center_x + radius, center_y + radius], fill=disc_color, outline=accent_color, width=3)
    
    # Sound grooves
    for r in range(radius - 20, int(radius * 0.45), -14):
        draw.ellipse([center_x - r, center_y - r, center_x + r, center_y + r], outline=(38, 42, 52), width=1)
        
    # Center label
    label_radius = int(radius * 0.35)
    draw.ellipse([center_x - label_radius, center_y - label_radius, center_x + label_radius, center_y + label_radius], fill=accent_color)
    
    # Spindle hole
    spindle_radius = int(radius * 0.08)
    draw.ellipse([center_x - spindle_radius, center_y - spindle_radius, center_x + spindle_radius, center_y + spindle_radius], fill=(11, 12, 16))

def generate_background_card(theme_key: str = "midnight", aspect_ratio: str = "16:9", title: str = "Aura Audio Track", artist: str = "Original Audio", output_path: str = None) -> str:
    """Generate a studio-quality backdrop for audio-to-video conversion."""
    theme = THEMES.get(theme_key, THEMES["midnight"])
    width, height = ASPECT_RATIOS.get(aspect_ratio, (1920, 1080))
    
    img = create_gradient_canvas(width, height, theme["bg_top"], theme["bg_bottom"])
    draw = ImageDraw.Draw(img)
    
    # Determine layout coordinates based on aspect ratio
    if aspect_ratio == "16:9":
        # Horizontal layout: Vinyl on left or center
        center_x = width // 3
        center_y = height // 2
        vinyl_radius = int(height * 0.35)
        draw_vinyl_graphic(draw, center_x, center_y, vinyl_radius, theme["accent"])
        
        # Text details on right
        text_x = int(width * 0.55)
        text_y = int(height * 0.42)
        draw.text((text_x, text_y), title[:40], fill=theme["text_primary"], font_size=int(height * 0.045))
        draw.text((text_x, text_y + int(height * 0.08)), artist[:40], fill=theme["text_secondary"], font_size=int(height * 0.03))
        
        # Audio bar graphic placeholder
        bar_y = text_y + int(height * 0.18)
        for i in range(24):
            bar_h = int(15 + 25 * abs(math.sin(i * 0.5)))
            bx = text_x + i * 16
            draw.line([(bx, bar_y + 20 - bar_h), (bx, bar_y + 20 + bar_h)], fill=theme["accent"], width=3)
            
    elif aspect_ratio == "9:16":
        # Vertical mobile layout: Vinyl centered higher, text below
        center_x = width // 2
        center_y = int(height * 0.38)
        vinyl_radius = int(width * 0.36)
        draw_vinyl_graphic(draw, center_x, center_y, vinyl_radius, theme["accent"])
        
        text_y = int(height * 0.65)
        draw.text((width // 2, text_y), title[:30], fill=theme["text_primary"], font_size=int(width * 0.055), anchor="mm")
        draw.text((width // 2, text_y + int(height * 0.04)), artist[:30], fill=theme["text_secondary"], font_size=int(width * 0.038), anchor="mm")
        
        # Audio bar graphic centered
        bar_y = text_y + int(height * 0.09)
        start_x = (width - (30 * 14)) // 2
        for i in range(30):
            bar_h = int(12 + 22 * abs(math.sin(i * 0.4)))
            bx = start_x + i * 14
            draw.line([(bx, bar_y - bar_h), (bx, bar_y + bar_h)], fill=theme["accent"], width=3)
            
    else: # 1:1 Square
        center_x = width // 2
        center_y = int(height * 0.40)
        vinyl_radius = int(width * 0.30)
        draw_vinyl_graphic(draw, center_x, center_y, vinyl_radius, theme["accent"])
        
        text_y = int(height * 0.76)
        draw.text((width // 2, text_y), title[:32], fill=theme["text_primary"], font_size=int(width * 0.05), anchor="mm")
        draw.text((width // 2, text_y + int(height * 0.05)), artist[:32], fill=theme["text_secondary"], font_size=int(width * 0.035), anchor="mm")
        
    if not output_path:
        out_file = PREVIEWS_DIR / f"backdrop_{theme_key}_{aspect_ratio.replace(':', 'x')}.jpg"
        output_path = str(out_file)
        
    img.save(output_path, quality=95)
    return output_path

def process_custom_image_to_aspect(input_image_path: str, aspect_ratio: str = "16:9", output_path: str = None) -> str:
    """Take a user's uploaded image and fit it into aspect ratio with blurred ambient backdrop."""
    target_w, target_h = ASPECT_RATIOS.get(aspect_ratio, (1920, 1080))
    src = Image.open(input_image_path).convert("RGB")
    
    # 1. Background: stretch and heavily blur to create rich ambient backdrop
    bg = src.resize((target_w, target_h), Image.Resampling.LANCZOS)
    bg = bg.filter(ImageFilter.GaussianBlur(radius=35))
    # Dim background slightly for contrast
    dimmer = Image.new("RGB", (target_w, target_h), (0, 0, 0))
    bg = Image.blend(bg, dimmer, 0.4)
    
    # 2. Foreground: preserve aspect ratio, fit inside with margin
    margin = 0.82
    max_fg_w = int(target_w * margin)
    max_fg_h = int(target_h * margin)
    
    src_ratio = src.width / src.height
    box_ratio = max_fg_w / max_fg_h
    
    if src_ratio > box_ratio:
        fg_w = max_fg_w
        fg_h = int(max_fg_w / src_ratio)
    else:
        fg_h = max_fg_h
        fg_w = int(max_fg_h * src_ratio)
        
    fg = src.resize((fg_w, fg_h), Image.Resampling.LANCZOS)
    
    # Paste centered
    offset_x = (target_w - fg_w) // 2
    offset_y = (target_h - fg_h) // 2
    bg.paste(fg, (offset_x, offset_y))
    
    # Draw soft subtle border
    draw = ImageDraw.Draw(bg)
    draw.rectangle([offset_x, offset_y, offset_x + fg_w, offset_y + fg_h], outline=(255, 255, 255, 60), width=2)
    
    if not output_path:
        out_file = PREVIEWS_DIR / f"ambient_cover_{target_w}x{target_h}.jpg"
        output_path = str(out_file)
        
    bg.save(output_path, quality=95)
    return output_path
