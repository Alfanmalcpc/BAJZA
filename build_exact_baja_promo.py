import os
import math
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

WIDTH = 1080
HEIGHT = 1920
FPS = 30
DURATION = 28.4
TOTAL_FRAMES = int(FPS * DURATION)
OUTPUT_PATH = r"C:\Users\ACER\Downloads\BAJA_WEB_Promo_Final_Exact.mp4"
TEMP_DIR = r"C:\Users\ACER\AppData\Local\Temp\baja_promo_exact"
AUDIO_PATH = "tiktok_audio.mp3"

os.makedirs(TEMP_DIR, exist_ok=True)

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

def get_font(size, bold=False):
    try:
        return ImageFont.truetype("arialbd.ttf" if bold else "arial.ttf", size)
    except:
        return ImageFont.load_default()

font_title = get_font(75, True)
font_subtitle = get_font(45, False)
font_large = get_font(100, True)
font_medium = get_font(55, True)
font_body = get_font(38, False)

def draw_rounded_rect(draw, box, radius, fill, outline=None, width=0):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def apply_glow(image, radius=50):
    return image.filter(ImageFilter.GaussianBlur(radius))

# --- CREATE EXACT BAJA WEB APP UI MOCKUP ---
def create_exact_baja_ui():
    w, h = 850, 1100
    ui = Image.new("RGBA", (w, h), (0,0,0,0))
    draw = ImageDraw.Draw(ui)
    
    # Outer Browser Window Frame (Dark Theme matching Baja Web)
    draw_rounded_rect(draw, [0, 0, w, h], 36, (18, 18, 24, 255), outline=(50, 50, 70, 255), width=3)
    
    # Browser Top Bar
    draw_rounded_rect(draw, [0, 0, w, 70], 36, (28, 28, 38, 255))
    # Window Dots
    draw.ellipse([25, 25, 41, 41], fill=(239, 68, 68, 255))
    draw.ellipse([50, 25, 66, 41], fill=(245, 158, 11, 255))
    draw.ellipse([75, 25, 91, 41], fill=(16, 185, 129, 255))
    
    # URL Bar inside Browser
    draw_rounded_rect(draw, [120, 15, w - 40, 55], 18, (15, 15, 20, 255))
    draw.text((150, 35), "🔒 https://bajza.my.id/tools/photobooth", fill=(160, 160, 180, 255), font=get_font(22, False), anchor="lm")
    
    # App Header inside UI
    draw.text((50, 110), "📸 PHOTOBOOTH STUDIO", fill=(255, 255, 255, 255), font=get_font(40, True))
    draw.text((50, 160), "Pilih tata letak, jepret fotomu berurutan, dan unduh hasilnya!", fill=(160, 170, 190, 255), font=get_font(24, False))
    
    # Multiplayer Button Badge
    draw_rounded_rect(draw, [50, 210, 320, 270], 15, (255, 255, 255, 255), outline=(0, 0, 0, 255), width=2)
    draw.text((185, 240), "👥 MULTIPLAYER MODE", fill=(0, 0, 0, 255), font=get_font(22, True), anchor="mm")
    
    # Webcam Video Box (Dual Cam simulation matching Baja Web Photobooth MP)
    cam_box = [50, 300, w - 50, 750]
    draw_rounded_rect(draw, cam_box, 25, (10, 10, 15, 255), outline=(59, 130, 246, 255), width=3)
    
    # Left Video Stream (Local)
    draw_rounded_rect(draw, [70, 320, w//2 - 10, 730], 20, (30, 30, 45, 255))
    draw.text((w//4 + 30, 525), "📷 KAMERA LIVE", fill=(255, 255, 255, 200), font=get_font(28, True), anchor="mm")
    # KAMU Badge
    draw_rounded_rect(draw, [90, 340, 180, 380], 10, (16, 185, 129, 255))
    draw.text((135, 360), "KAMU", fill=(255, 255, 255, 255), font=get_font(18, True), anchor="mm")
    
    # Right Video Stream (Remote / Teman)
    draw_rounded_rect(draw, [w//2 + 10, 320, w - 70, 730], 20, (30, 30, 45, 255))
    draw.text((w*3//4 - 30, 525), "👥 TEMAN (P2P SYNC)", fill=(59, 130, 246, 200), font=get_font(28, True), anchor="mm")
    # TEMAN Badge
    draw_rounded_rect(draw, [w//2 + 30, 340, w//2 + 150, 380], 10, (59, 130, 246, 255))
    draw.text((w//2 + 90, 360), "TEMANMU", fill=(255, 255, 255, 255), font=get_font(18, True), anchor="mm")
    
    # Capture & Action Bar below camera
    draw_rounded_rect(draw, [50, 780, w - 50, 880], 25, (239, 68, 68, 255))
    draw.text((w//2, 830), "📸 JEPRET SEKARANG (3.. 2.. 1..)", fill=(255, 255, 255, 255), font=get_font(32, True), anchor="mm")
    
    # Bottom Tools Bar (Downloader, Converter, Compressor)
    draw_rounded_rect(draw, [50, 920, w - 50, 1060], 25, (24, 24, 34, 255), outline=(50, 50, 70, 255), width=2)
    draw.text((120, 990), "📥 Downloader", fill=(250, 204, 21, 255), font=get_font(26, True), anchor="lm")
    draw.text((400, 990), "⚡ Converter", fill=(56, 189, 248, 255), font=get_font(26, True), anchor="lm")
    draw.text((670, 990), "📦 Compressor", fill=(16, 185, 129, 255), font=get_font(26, True), anchor="lm")
    
    return ui

baja_ui_base = create_exact_baja_ui()

def get_tilted_baja_ui(tilt_angle, squash_ratio):
    rot = baja_ui_base.rotate(tilt_angle, resample=Image.BICUBIC, expand=True)
    w, h = rot.size
    return rot.resize((w, int(h * squash_ratio)), resample=Image.BICUBIC)

tilted_baja_ui = get_tilted_baja_ui(15, 0.82)

print("Rendering exact BAJA WEB promotional frames...")

for i in range(TOTAL_FRAMES):
    t = i / FPS
    
    # 1. AMBIENT BACKGROUND (Deep SaaS Dark)
    frame = Image.new("RGBA", (WIDTH, HEIGHT), (11, 11, 18, 255))
    glow_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0,0,0,0))
    glow_draw = ImageDraw.Draw(glow_layer)
    
    orb1_x = WIDTH//2 + math.sin(t * 0.5) * 350
    orb1_y = HEIGHT//2 + math.cos(t * 0.4) * 250
    glow_draw.ellipse([orb1_x - 500, orb1_y - 500, orb1_x + 500, orb1_y + 500], fill=(59, 130, 246, 45)) # Cyan glow
    
    orb2_x = WIDTH//2 + math.cos(t * 0.6) * 300
    orb2_y = HEIGHT//2 + math.sin(t * 0.7) * 350
    glow_draw.ellipse([orb2_x - 600, orb2_y - 600, orb2_x + 600, orb2_y + 600], fill=(236, 72, 153, 35)) # Pink glow
    
    frame = Image.alpha_composite(frame, apply_glow(glow_layer, 120))
    draw = ImageDraw.Draw(frame)

    # 2. SCENERY
    if t < 8.0:
        # SCENE 1: HOOK (0s - 8s)
        p1 = min(1.0, max(0.0, (t - 1.0) / 1.5))
        e1 = ease_out_expo(p1)
        p2 = min(1.0, max(0.0, (t - 2.5) / 1.5))
        e2 = ease_out_expo(p2)
        
        p_out = min(1.0, max(0.0, (t - 7.0) / 1.0))
        y_offset = -100 * ease_in_out_cubic(p_out)
        alpha = int(255 * (1.0 - p_out))
        
        if alpha > 0:
            c_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0,0,0,0))
            c_draw = ImageDraw.Draw(c_layer)
            
            if e1 > 0:
                y1 = HEIGHT//2 - 60 + y_offset + (1.0 - e1) * 50
                c_draw.text((WIDTH//2, y1), "photobooth multiplayer", fill=(255,255,255, int(255*e1)), font=font_large, anchor="mm")
            if e2 > 0:
                y2 = HEIGHT//2 + 60 + y_offset + (1.0 - e2) * 50
                c_draw.text((WIDTH//2, y2), "tanpa delay & lag.", fill=(59, 130, 246, int(255*e2)), font=font_large, anchor="mm")
                
            c_layer.putalpha(Image.eval(c_layer.split()[3], lambda a: int(a * (alpha/255.0))))
            frame = Image.alpha_composite(frame, c_layer)
            draw = ImageDraw.Draw(frame)

    elif t < 18.0:
        # SCENE 2: HERO MOCKUP (8s - 18s)
        local_t = t - 8.0
        p_in = min(1.0, max(0.0, local_t / 1.5))
        e_in = ease_out_back(p_in)
        p_out = min(1.0, max(0.0, (local_t - 9.0) / 1.0))
        e_out = ease_in_out_cubic(p_out)
        alpha_scene = int(255 * (1.0 - p_out))
        
        if alpha_scene > 0:
            s_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0,0,0,0))
            s_draw = ImageDraw.Draw(s_layer)
            
            # Volumetric Backlight Glow
            glow_w, glow_h = 900, 700
            glow_img = Image.new("RGBA", (glow_w, glow_h), (0,0,0,0))
            ImageDraw.Draw(glow_img).ellipse([0, 0, glow_w, glow_h], fill=(59, 130, 246, int(180 * e_in)))
            glow_img = apply_glow(glow_img, 90)
            glow_x = WIDTH//2 - glow_w//2
            glow_y = int(HEIGHT//2 - glow_h//2 + 150 - (e_in * 200) + (e_out * 600))
            s_layer.paste(glow_img, (glow_x, glow_y), glow_img)
            
            # Tilted UI Mockup
            mock_w, mock_h = tilted_baja_ui.size
            mock_x = WIDTH//2 - mock_w//2
            hover = math.sin(local_t * 2.0) * 12
            mock_y = int(HEIGHT//2 - mock_h//2 + 350 - (e_in * 300) + hover + (e_out * 800))
            s_layer.paste(tilted_baja_ui, (mock_x, mock_y), tilted_baja_ui)
            
            # Floating Badges
            c1_p = min(1.0, max(0.0, (local_t - 0.5) / 1.0))
            c1_e = ease_out_back(c1_p)
            c1_y = int(mock_y - 80 + (1.0 - c1_e)*200 + math.cos(local_t * 2.5) * 20)
            if c1_e > 0:
                c1_img = Image.new("RGBA", (420, 100), (0,0,0,0))
                c1_draw = ImageDraw.Draw(c1_img)
                draw_rounded_rect(c1_draw, [0, 0, 420, 100], 25, (16, 185, 129, 240), outline=(255,255,255,200), width=3)
                c1_draw.text((210, 50), "🟢 Real-time WebRTC Sync", fill=(255,255,255,255), font=font_body, anchor="mm")
                c1_img = c1_img.rotate(4, resample=Image.BICUBIC, expand=True)
                s_layer.paste(c1_img, (mock_x - 50, c1_y), c1_img)

            # Top Text
            text_y = int(260 - (1.0 - e_in)*100 - (e_out * 200))
            s_draw.text((WIDTH//2, text_y), "BAJA WEB STUDIO", fill=(59, 130, 246, 255), font=font_subtitle, anchor="mm")
            s_draw.text((WIDTH//2, text_y + 70), "Main Bareng Langsung dari Browser", fill=(255,255,255,255), font=font_title, anchor="mm")

            s_layer.putalpha(Image.eval(s_layer.split()[3], lambda a: int(a * (alpha_scene/255.0))))
            frame = Image.alpha_composite(frame, s_layer)
            draw = ImageDraw.Draw(frame)

    elif t < 28.5:
        # SCENE 3: STACK & CTA (18s - 28.4s)
        local_t = t - 18.0
        cards_data = [
            ("PHOTOBOOTH MP:", "Sinkronisasi jepretan antar perangkat\n(HP & Laptop) tanpa kolom hitam.", (56, 189, 248), 0.5),
            ("VIDEO DOWNLOADER:", "Unduh video HD dari berbagai platform\nlangsung tersimpan instan.", (250, 204, 21), 0.2),
            ("ALL-IN-ONE TOOLS:", "Kompres, konversi format, dan kalkulator\nsaintifik lengkap di satu tempat.", (244, 63, 94), 0.0)
        ]
        
        p_out = min(1.0, max(0.0, (local_t - 7.5) / 1.0))
        e_out = ease_in_out_cubic(p_out)
        
        for idx, (title, desc, color, delay) in enumerate(reversed(cards_data)):
            real_idx = 2 - idx
            p_in = min(1.0, max(0.0, (local_t - delay) / 0.8))
            e_in = ease_out_expo(p_in)
            
            if e_in > 0:
                is_active = (real_idx == 0) and (local_t > 0.8)
                stack_y = 520 + real_idx * 40
                stack_scale = 1.0 - (real_idx * 0.05)
                c_x = int(WIDTH//2 + (1.0 - e_in) * 800)
                c_y = int(stack_y - (e_out * 500))
                
                cw, ch = int(820 * stack_scale), int(420 * stack_scale)
                c_img = Image.new("RGBA", (cw, ch), (0,0,0,0))
                c_draw = ImageDraw.Draw(c_img)
                
                if is_active:
                    draw_rounded_rect(c_draw, [10, 10, cw-10, ch-10], 40, (0,0,0, 150))
                    
                bg_col = (255,255,255,255) if is_active else (210,210,225,255)
                draw_rounded_rect(c_draw, [0, 0, cw-20, ch-20], 35, bg_col, outline=color, width=4)
                
                c_draw.text((50, 50), title, fill=color, font=get_font(int(36*stack_scale), True))
                lines = desc.split('\n')
                for li, line in enumerate(lines):
                    c_draw.text((50, 130 + li*60*stack_scale), line, fill=(15, 23, 42, 255), font=get_font(int(32*stack_scale), True))
                
                frame.paste(c_img, (c_x - cw//2, c_y), c_img)

        t_p = min(1.0, max(0.0, local_t / 1.0))
        t_y = int(250 - (1.0 - ease_out_expo(t_p))*100 - (e_out * 300))
        draw.text((WIDTH//2, t_y), "Fitur Unggulan BAJA WEB", fill=(56, 189, 248, int(255*t_p)), font=font_title, anchor="mm")
        
        # CTA (25.5s)
        cta_t = local_t - 7.5
        if cta_t > 0:
            cta_p = min(1.0, max(0.0, cta_t / 1.0))
            cta_e = ease_out_back(cta_p)
            cta_y = int(HEIGHT//2 + (1.0 - cta_e) * 300)
            
            pulse = math.sin(cta_t * 5.0) * 20
            gw, gh = 820, 300
            g_img = Image.new("RGBA", (gw, gh), (0,0,0,0))
            ImageDraw.Draw(g_img).ellipse([0, 0, gw, gh], fill=(59, 130, 246, int(180 + pulse*2)))
            g_img = apply_glow(g_img, 100)
            frame.paste(g_img, (WIDTH//2 - gw//2, cta_y - gh//2), g_img)
            
            c_box = [WIDTH//2 - 410, cta_y - 120, WIDTH//2 + 410, cta_y + 120]
            draw_rounded_rect(draw, c_box, 60, (15, 23, 42, 255), outline=(59, 130, 246, 255), width=6)
            
            draw.text((WIDTH//2, cta_y - 35), "Kunjungi Sekarang:", fill=(255,255,255,200), font=font_subtitle, anchor="mm")
            draw.text((WIDTH//2, cta_y + 35), "bajza.my.id", fill=(255,255,255,255), font=font_large, anchor="mm")

    frame_path = os.path.join(TEMP_DIR, f"frame_{i:04d}.png")
    frame.convert("RGB").save(frame_path)

print("Rendering exact frames completed! Running FFmpeg export...")

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
print(f"Exact video created successfully at: {OUTPUT_PATH}")
