import os
import math
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

WIDTH = 1080
HEIGHT = 1920
FPS = 30
DURATION = 28.4
TOTAL_FRAMES = int(FPS * DURATION)
OUTPUT_PATH = r"C:\Users\ACER\Downloads\BAJA_WEB_Promo_Final.mp4"
TEMP_DIR = r"C:\Users\ACER\AppData\Local\Temp\baja_promo_v3"
AUDIO_PATH = "tiktok_audio.mp3"

os.makedirs(TEMP_DIR, exist_ok=True)

# --- EASING FUNCTIONS ---
def ease_out_expo(x):
    return 1 if x >= 1 else 1 - math.pow(2, -10 * x)

def ease_in_out_cubic(x):
    if x <= 0: return 0
    if x >= 1: return 1
    return 4 * x * x * x if x < 0.5 else 1 - math.pow(-2 * x + 2, 3) / 2

def ease_out_back(x):
    if x <= 0: return 0
    if x >= 1: return 1
    c1 = 1.70158
    c3 = c1 + 1
    return 1 + c3 * math.pow(x - 1, 3) + c1 * math.pow(x - 1, 2)

# --- FONTS ---
def get_font(size, bold=False):
    try:
        return ImageFont.truetype("arialbd.ttf" if bold else "arial.ttf", size)
    except:
        return ImageFont.load_default()

font_title = get_font(80, True)
font_subtitle = get_font(50, False)
font_large = get_font(110, True)
font_medium = get_font(60, True)
font_body = get_font(40, False)

# --- HELPERS ---
def draw_rounded_rect(draw, box, radius, fill, outline=None, width=0):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def apply_glow(image, radius=50):
    return image.filter(ImageFilter.GaussianBlur(radius))

# Pre-render 3D UI Mockup Base
def create_ui_mockup():
    w, h = 800, 1000
    ui = Image.new("RGBA", (w, h), (0,0,0,0))
    draw = ImageDraw.Draw(ui)
    
    # Base Card
    draw_rounded_rect(draw, [0, 0, w, h], 40, (24, 24, 30, 255), outline=(50, 50, 70, 255), width=4)
    
    # Navbar
    draw.text((50, 40), "BAJA WEB", fill=(255,255,255,255), font=get_font(40, True))
    draw_rounded_rect(draw, [w - 180, 40, w - 40, 90], 25, (59, 130, 246, 255))
    draw.text((w - 110, 65), "Get Started", fill=(255,255,255,255), font=get_font(24, True), anchor="mm")
    
    # Hero Text
    draw_rounded_rect(draw, [50, 160, 220, 200], 20, (16, 185, 129, 50))
    draw.text((135, 180), "All-in-one platform", fill=(16, 185, 129, 255), font=get_font(20, True), anchor="mm")
    
    draw.text((50, 230), "Tools Terbaik", fill=(255,255,255,255), font=get_font(70, True))
    draw.text((50, 310), "Untuk Kebutuhanmu", fill=(59, 130, 246, 255), font=get_font(70, True))
    
    # Content Blocks (Mockup images)
    draw_rounded_rect(draw, [50, 440, w//2 - 20, 700], 30, (30, 41, 59, 255)) # Block 1
    draw.text((w//4 + 15, 570), "PHOTOBOOTH", fill=(255,255,255,100), font=get_font(30, True), anchor="mm")
    
    draw_rounded_rect(draw, [w//2 + 20, 440, w - 50, 700], 30, (30, 41, 59, 255)) # Block 2
    draw.text((w*3//4 - 15, 570), "DOWNLOADER", fill=(255,255,255,100), font=get_font(30, True), anchor="mm")
    
    draw_rounded_rect(draw, [50, 740, w - 50, 920], 30, (30, 41, 59, 255)) # Block 3
    
    return ui

mockup_base = create_ui_mockup()

def get_tilted_mockup(tilt_angle, squash_ratio):
    # Rotate and scale to simulate isometric 3D tilt
    rot = mockup_base.rotate(tilt_angle, resample=Image.BICUBIC, expand=True)
    w, h = rot.size
    return rot.resize((w, int(h * squash_ratio)), resample=Image.BICUBIC)

# Pre-render tilted mockups to save time (we'll use a fixed angle for the hero shot)
tilted_ui = get_tilted_mockup(18, 0.85)

print("Rendering frames...")

for i in range(TOTAL_FRAMES):
    t = i / FPS
    
    # --- 1. AMBIENT BACKGROUND ---
    # Dark mode deep indigo/navy
    frame = Image.new("RGBA", (WIDTH, HEIGHT), (11, 11, 20, 255))
    bg_draw = ImageDraw.Draw(frame)
    
    # Moving glowing orbs for cinematic SaaS lighting
    glow_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0,0,0,0))
    glow_draw = ImageDraw.Draw(glow_layer)
    
    orb1_x = WIDTH//2 + math.sin(t * 0.5) * 400
    orb1_y = HEIGHT//2 + math.cos(t * 0.4) * 300
    glow_draw.ellipse([orb1_x - 500, orb1_y - 500, orb1_x + 500, orb1_y + 500], fill=(59, 130, 246, 40)) # Cyan/Blue
    
    orb2_x = WIDTH//2 + math.cos(t * 0.6) * 300
    orb2_y = HEIGHT//2 + math.sin(t * 0.7) * 400
    glow_draw.ellipse([orb2_x - 600, orb2_y - 600, orb2_x + 600, orb2_y + 600], fill=(139, 92, 246, 30)) # Violet
    
    # Composite blurred glows
    frame = Image.alpha_composite(frame, apply_glow(glow_layer, 100))
    draw = ImageDraw.Draw(frame)

    # --- 2. KINETIC SCENES ---
    if t < 8.0:
        # SCENE 1: THE HOOK (0s - 8s)
        # Text reveal: "ubah idemu" -> "jadi website nyata"
        # Progress 0 to 1 between t=1.0 and t=2.0
        p1 = min(1.0, max(0.0, (t - 1.0) / 1.5))
        e1 = ease_out_expo(p1)
        
        # Second line reveal
        p2 = min(1.0, max(0.0, (t - 2.5) / 1.5))
        e2 = ease_out_expo(p2)
        
        # Fade out whole scene
        p_out = min(1.0, max(0.0, (t - 7.0) / 1.0))
        y_offset = -100 * ease_in_out_cubic(p_out)
        alpha = int(255 * (1.0 - p_out))
        
        text1 = "solusi kreatif"
        text2 = "dalam satu tap."
        
        # Draw with clipping/opacity simulation
        if alpha > 0:
            c_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0,0,0,0))
            c_draw = ImageDraw.Draw(c_layer)
            
            # Line 1
            if e1 > 0:
                y1 = HEIGHT//2 - 60 + y_offset + (1.0 - e1) * 50
                c_draw.text((WIDTH//2, y1), text1, fill=(255,255,255, int(255*e1)), font=font_large, anchor="mm")
            
            # Line 2
            if e2 > 0:
                y2 = HEIGHT//2 + 60 + y_offset + (1.0 - e2) * 50
                c_draw.text((WIDTH//2, y2), text2, fill=(59, 130, 246, int(255*e2)), font=font_large, anchor="mm")
                
            # Composite text
            c_layer.putalpha(Image.eval(c_layer.split()[3], lambda a: int(a * (alpha/255.0))))
            frame = Image.alpha_composite(frame, c_layer)
            draw = ImageDraw.Draw(frame)

    elif t < 18.0:
        # SCENE 2: THE HERO 3D MOCKUP (8s - 18s)
        local_t = t - 8.0
        
        # Intro animation for mockup
        p_in = min(1.0, max(0.0, local_t / 1.5))
        e_in = ease_out_back(p_in)
        
        # Outro animation
        p_out = min(1.0, max(0.0, (local_t - 9.0) / 1.0))
        e_out = ease_in_out_cubic(p_out)
        
        alpha_scene = int(255 * (1.0 - p_out))
        
        if alpha_scene > 0:
            s_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0,0,0,0))
            s_draw = ImageDraw.Draw(s_layer)
            
            # 1. Volumetric Backlight Glow behind the mockup
            glow_w, glow_h = 800, 600
            glow_img = Image.new("RGBA", (glow_w, glow_h), (0,0,0,0))
            ImageDraw.Draw(glow_img).ellipse([0, 0, glow_w, glow_h], fill=(59, 130, 246, int(150 * e_in)))
            glow_img = apply_glow(glow_img, 80)
            glow_x = WIDTH//2 - glow_w//2
            glow_y = int(HEIGHT//2 - glow_h//2 + 200 - (e_in * 200) + (e_out * 500))
            s_layer.paste(glow_img, (glow_x, glow_y), glow_img)
            
            # 2. Draw Tilted Mockup
            mock_w, mock_h = tilted_ui.size
            mock_x = WIDTH//2 - mock_w//2
            # Float effect
            hover = math.sin(local_t * 2.0) * 15
            mock_y = int(HEIGHT//2 - mock_h//2 + 400 - (e_in * 300) + hover + (e_out * 800))
            
            s_layer.paste(tilted_ui, (mock_x, mock_y), tilted_ui)
            
            # 3. Floating Feature Cards (Parallax)
            # Card 1 (Yellow)
            c1_p = min(1.0, max(0.0, (local_t - 0.5) / 1.0))
            c1_e = ease_out_back(c1_p)
            c1_y = int(mock_y - 100 + (1.0 - c1_e)*200 + math.cos(local_t * 2.5) * 20)
            if c1_e > 0:
                c1_img = Image.new("RGBA", (400, 120), (0,0,0,0))
                c1_draw = ImageDraw.Draw(c1_img)
                draw_rounded_rect(c1_draw, [0, 0, 400, 120], 30, (245, 158, 11, 240), outline=(255,255,255,200), width=3)
                c1_draw.text((200, 60), "📸 Photobooth P2P", fill=(255,255,255,255), font=font_body, anchor="mm")
                c1_img = c1_img.rotate(5, resample=Image.BICUBIC, expand=True)
                s_layer.paste(c1_img, (mock_x - 100, c1_y), c1_img)
                
            # Card 2 (Cyan)
            c2_p = min(1.0, max(0.0, (local_t - 0.8) / 1.0))
            c2_e = ease_out_back(c2_p)
            c2_y = int(mock_y + 400 + (1.0 - c2_e)*200 + math.sin(local_t * 2.2) * 15)
            if c2_e > 0:
                c2_img = Image.new("RGBA", (450, 120), (0,0,0,0))
                c2_draw = ImageDraw.Draw(c2_img)
                draw_rounded_rect(c2_draw, [0, 0, 450, 120], 30, (16, 185, 129, 240), outline=(255,255,255,200), width=3)
                c2_draw.text((225, 60), "⚡ Converter Instan", fill=(255,255,255,255), font=font_body, anchor="mm")
                c2_img = c2_img.rotate(-4, resample=Image.BICUBIC, expand=True)
                s_layer.paste(c2_img, (mock_x + mock_w - 250, c2_y), c2_img)

            # 4. Top Text
            text_y = int(300 - (1.0 - e_in)*100 - (e_out * 200))
            s_draw.text((WIDTH//2, text_y), "FITUR TANPA BATAS", fill=(59, 130, 246, 255), font=font_subtitle, anchor="mm")
            s_draw.text((WIDTH//2, text_y + 80), "Eksplorasi Tanpa Install", fill=(255,255,255,255), font=font_title, anchor="mm")

            s_layer.putalpha(Image.eval(s_layer.split()[3], lambda a: int(a * (alpha_scene/255.0))))
            frame = Image.alpha_composite(frame, s_layer)
            draw = ImageDraw.Draw(frame)

    elif t < 28.5:
        # SCENE 3: TESTIMONIAL STACK & CTA (18s - 28.4s)
        local_t = t - 18.0
        
        # Testimonial/Tools Cards Stack (Slide in from right)
        cards_data = [
            ("DAVID SAYS:", "Photobooth multiplayer-nya lancar banget!\nBisa langsung foto bareng temen LDR.", (250, 204, 21), 0.5),
            ("KRISTINE SAYS:", "Video downloader HD terbaik tanpa watermark.\nSangat membantu produktivitas!", (56, 189, 248), 0.2),
            ("ALEX SAYS:", "Keren parah! Kompres video 80% tapi\nkualitas tetap bening. Web ter-gabut!", (244, 63, 94), 0.0)
        ]
        
        # Outro Fade
        p_out = min(1.0, max(0.0, (local_t - 7.5) / 1.0))
        e_out = ease_in_out_cubic(p_out)
        
        # Draw cards from back to front
        for idx, (name, review, color, delay) in enumerate(reversed(cards_data)):
            real_idx = 2 - idx
            p_in = min(1.0, max(0.0, (local_t - delay) / 0.8))
            e_in = ease_out_expo(p_in)
            
            if e_in > 0:
                # Active card is the last one in the reversed list (real_idx == 0)
                is_active = (real_idx == 0) and (local_t > 0.8)
                
                # Stack offsets
                stack_y = 500 + real_idx * 40
                stack_scale = 1.0 - (real_idx * 0.05)
                
                # Slide in from right
                c_x = int(WIDTH//2 + (1.0 - e_in) * 800)
                c_y = int(stack_y - (e_out * 500))
                
                cw, ch = int(800 * stack_scale), int(450 * stack_scale)
                c_img = Image.new("RGBA", (cw, ch), (0,0,0,0))
                c_draw = ImageDraw.Draw(c_img)
                
                # Card Shadow
                if is_active:
                    draw_rounded_rect(c_draw, [10, 10, cw-10, ch-10], 40, (0,0,0, 150))
                    
                # Card Body
                bg_col = (255,255,255,255) if is_active else (220,220,230,255)
                draw_rounded_rect(c_draw, [0, 0, cw-20, ch-20], 35, bg_col, outline=color, width=4)
                
                # Card Content
                c_draw.text((50, 50), name, fill=color, font=get_font(int(36*stack_scale), True))
                
                # Draw stars
                for s in range(5):
                    c_draw.text((50 + s*40*stack_scale, 110), "★", fill=(250, 204, 21, 255), font=get_font(int(40*stack_scale)))
                
                # Draw review text (multiline)
                lines = review.split('\n')
                for li, line in enumerate(lines):
                    c_draw.text((50, 180 + li*50*stack_scale), line, fill=(15, 23, 42, 255), font=get_font(int(32*stack_scale), True))
                
                frame.paste(c_img, (c_x - cw//2, c_y), c_img)

        # Title
        t_p = min(1.0, max(0.0, local_t / 1.0))
        t_y = int(250 - (1.0 - ease_out_expo(t_p))*100 - (e_out * 300))
        draw.text((WIDTH//2, t_y), "Terbukti Kualitasnya", fill=(56, 189, 248, int(255*t_p)), font=font_title, anchor="mm")
        
        # --- THE CTA (Appears at 25.5s) ---
        cta_t = local_t - 7.5
        if cta_t > 0:
            cta_p = min(1.0, max(0.0, cta_t / 1.0))
            cta_e = ease_out_back(cta_p)
            
            cta_y = int(HEIGHT//2 + (1.0 - cta_e) * 300)
            
            # Massive Glow
            pulse = math.sin(cta_t * 5.0) * 20
            gw, gh = 800, 300
            g_img = Image.new("RGBA", (gw, gh), (0,0,0,0))
            ImageDraw.Draw(g_img).ellipse([0, 0, gw, gh], fill=(59, 130, 246, int(180 + pulse*2)))
            g_img = apply_glow(g_img, 100)
            frame.paste(g_img, (WIDTH//2 - gw//2, cta_y - gh//2), g_img)
            
            # CTA Card
            c_box = [WIDTH//2 - 400, cta_y - 120, WIDTH//2 + 400, cta_y + 120]
            draw_rounded_rect(draw, c_box, 60, (15, 23, 42, 255), outline=(59, 130, 246, 255), width=6)
            
            draw.text((WIDTH//2, cta_y - 200), "Coba Sekarang Gratis!", fill=(255,255,255,255), font=font_subtitle, anchor="mm")
            draw.text((WIDTH//2, cta_y), "bajza.my.id", fill=(255,255,255,255), font=font_large, anchor="mm")

    # Save
    frame_path = os.path.join(TEMP_DIR, f"frame_{i:04d}.png")
    frame.convert("RGB").save(frame_path)
    if i % 60 == 0:
        print(f"Rendered {i}/{TOTAL_FRAMES} frames ({t:.1f}s)")

print("All frames rendered successfully! Running FFmpeg export...")

# Encode
cmd = [
    "ffmpeg", "-y",
    "-framerate", str(FPS),
    "-i", os.path.join(TEMP_DIR, "frame_%04d.png"),
    "-i", AUDIO_PATH,
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    OUTPUT_PATH
]

subprocess.run(cmd, check=True)
print(f"Video created successfully at: {OUTPUT_PATH}")
