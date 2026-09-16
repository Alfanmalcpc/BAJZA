import os
import math
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

WIDTH = 1080
HEIGHT = 1920
FPS = 30
DURATION_SEC = 28.0
TOTAL_FRAMES = int(FPS * DURATION_SEC) # 840 frames
OUTPUT_PATH = r"C:\Users\ACER\Downloads\BAJA_WEB_Promo_916_Dynamic.mp4"
TEMP_DIR = r"C:\Users\ACER\AppData\Local\Temp\baja_promo_dynamic"
AUDIO_PATH = "tiktok_audio.mp3"

os.makedirs(TEMP_DIR, exist_ok=True)

# Easing functions
def ease_out_back(x):
    c1 = 1.70158
    c3 = c1 + 1
    return 1 + c3 * math.pow(x - 1, 3) + c1 * math.pow(x - 1, 2)

def ease_out_cubic(x):
    return 1 - math.pow(1 - x, 3)

def ease_in_out_quad(x):
    return 2 * x * x if x < 0.5 else 1 - math.pow(-2 * x + 2, 2) / 2

# Helper: Draw smooth rounded card with glow/shadow
def draw_smooth_card(draw, box, fill_color, border_color=None, border_width=3, radius=32):
    draw.rounded_rectangle(box, radius=radius, fill=fill_color, outline=border_color, width=border_width)

print(f"Generating {TOTAL_FRAMES} high-end dynamic motion frames...")

for i in range(TOTAL_FRAMES):
    t = i / FPS # current time in seconds
    
    # 1. Base Animated Background: Deep Dark Luxury Gradient with glowing moving blobs
    bg = Image.new("RGBA", (WIDTH, HEIGHT), (10, 15, 29, 255))
    draw = ImageDraw.Draw(bg)
    
    # Moving ambient glow orbs
    orb1_x = int(WIDTH * 0.3 + 120 * math.sin(t * 0.8))
    orb1_y = int(HEIGHT * 0.3 + 150 * math.cos(t * 0.6))
    orb2_x = int(WIDTH * 0.7 + 140 * math.cos(t * 0.7))
    orb2_y = int(HEIGHT * 0.7 + 120 * math.sin(t * 0.9))
    orb3_x = int(WIDTH * 0.5 + 100 * math.sin(t * 1.1))
    orb3_y = int(HEIGHT * 0.5 + 80 * math.cos(t * 1.2))
    
    draw.ellipse([orb1_x - 380, orb1_y - 380, orb1_x + 380, orb1_y + 380], fill=(99, 102, 241, 35)) # Indigo
    draw.ellipse([orb2_x - 420, orb2_y - 420, orb2_x + 420, orb2_y + 420], fill=(236, 72, 153, 30)) # Pink neon
    draw.ellipse([orb3_x - 300, orb3_y - 300, orb3_x + 300, orb3_y + 300], fill=(16, 185, 129, 25)) # Emerald

    # Subtle perspective grid floor effect
    for gy in range(HEIGHT - 400, HEIGHT, 40):
        y_pos = gy + int((t * 60) % 40)
        alpha = int(255 * (y_pos - (HEIGHT - 400)) / 400 * 0.15)
        draw.line([(0, y_pos), (WIDTH, y_pos)], fill=(255, 255, 255, alpha), width=1)
    for gx in range(0, WIDTH, 120):
        draw.line([(gx, HEIGHT - 400), (int(WIDTH/2 + (gx - WIDTH/2)*1.8), HEIGHT)], fill=(255, 255, 255, 25), width=1)

    # 2. SCENE LOGIC with dynamic motion & typography
    if t < 6.5:
        # --- SCENE 1: HOOK & INTRO (0 - 6.5s) ---
        scene_t = t / 6.5
        
        # Badge drop-in with bounce
        badge_p = min(1.0, t / 0.8)
        badge_y = -100 + ease_out_back(badge_p) * 450
        
        draw_smooth_card(draw, [WIDTH//2 - 280, int(badge_y), WIDTH//2 + 280, int(badge_y + 70)], (30, 41, 59, 230), (59, 130, 246, 255), 2, 35)
        draw.text((WIDTH//2, int(badge_y + 35)), "⚡ THE NEXT-GEN WEB PLATFORM", fill="#60A5FA", font=ImageFont.truetype("arialbd.ttf", 26), anchor="mm")

        # Main Title Scale & Float
        title_p = min(1.0, max(0.0, (t - 0.4) / 0.9))
        title_scale = ease_out_back(title_p)
        float_y = 12 * math.sin(t * 3.0)
        
        # Main glow card
        card_top = int(620 + float_y + (1.0 - title_scale) * 200)
        card_h = 420
        draw_smooth_card(draw, [100, card_top, WIDTH - 100, card_top + card_h], (15, 23, 42, 240), (99, 102, 241, 180), 3, 36)
        
        # Shiny glass reflection bar on card
        ref_x = int(((t * 350) % 1600) - 400)
        draw.polygon([(100 + ref_x, card_top), (220 + ref_x, card_top), (160 + ref_x, card_top + card_h), (40 + ref_x, card_top + card_h)], fill=(255, 255, 255, 18))

        draw.text((WIDTH//2, card_top + 110), "BAJA WEB", fill="#FFFFFF", font=ImageFont.truetype("arialbd.ttf", 100), anchor="mm")
        draw.text((WIDTH//2, card_top + 210), "bajza.my.id", fill="#38BDF8", font=ImageFont.truetype("arialbd.ttf", 44), anchor="mm")
        draw.text((WIDTH//2, card_top + 310), "Satu Web, Berjuta Solusi Gabut & Kreatif", fill="#94A3B8", font=ImageFont.truetype("arial.ttf", 32), anchor="mm")

        # Bottom feature highlights floating up
        feat_p = min(1.0, max(0.0, (t - 1.2) / 0.8))
        feat_y = int(1200 + (1.0 - ease_out_cubic(feat_p)) * 300)
        
        draw_smooth_card(draw, [140, feat_y, WIDTH - 140, feat_y + 110], (24, 24, 27, 220), (16, 185, 129, 200), 2, 28)
        draw.text((WIDTH//2, feat_y + 55), "✨ 100% Gratis • Tanpa Login Ribet", fill="#34D399", font=ImageFont.truetype("arialbd.ttf", 34), anchor="mm")

    elif t < 14.0:
        # --- SCENE 2: PHOTOBOOTH MULTIPLAYER REAL-TIME (6.5 - 14.0s) ---
        scene_t = (t - 6.5) / 7.5
        
        # Header Slide In
        head_p = min(1.0, scene_t / 0.15)
        head_x = -400 + ease_out_cubic(head_p) * (WIDTH//2 + 400)
        draw.text((head_x, 240), "FITUR VIRAL TERBARU 🔥", fill="#F43F5E", font=ImageFont.truetype("arialbd.ttf", 32), anchor="mm")
        draw.text((head_x, 320), "PHOTOBOOTH MULTIPLAYER", fill="#FFFFFF", font=ImageFont.truetype("arialbd.ttf", 60), anchor="mm")

        # Mockup Dual Cam interactive split
        mock_p = min(1.0, max(0.0, (scene_t - 0.1) / 0.2))
        mock_y = int(430 + (1.0 - ease_out_back(mock_p)) * 400)
        
        # Container frame
        draw_smooth_card(draw, [70, mock_y, WIDTH - 70, mock_y + 680], (30, 41, 59, 255), (244, 63, 94, 220), 4, 32)
        
        # Left Cam (Local)
        left_box = [95, mock_y + 30, WIDTH//2 - 15, mock_y + 650]
        draw_smooth_card(draw, left_box, (15, 23, 42, 255), (59, 130, 246, 180), 2, 20)
        draw.text(((left_box[0] + left_box[2])//2, mock_y + 70), "KAMU (LOKAL)", fill="#60A5FA", font=ImageFont.truetype("arialbd.ttf", 26), anchor="mm")
        # Pulse dot
        draw.ellipse([left_box[0] + 25, mock_y + 60, left_box[0] + 45, mock_y + 80], fill=(34, 197, 94, 255))
        
        # User 1 silhouette icon / avatar
        draw.ellipse([WIDTH//4 - 50, mock_y + 240, WIDTH//4 + 50, mock_y + 340], fill=(59, 130, 246, 100))
        draw.ellipse([WIDTH//4 - 80, mock_y + 360, WIDTH//4 + 80, mock_y + 500], fill=(59, 130, 246, 80))

        # Right Cam (Remote Friend)
        right_box = [WIDTH//2 + 15, mock_y + 30, WIDTH - 95, mock_y + 650]
        draw_smooth_card(draw, right_box, (15, 23, 42, 255), (236, 72, 153, 180), 2, 20)
        draw.text(((right_box[0] + right_box[2])//2, mock_y + 70), "TEMANMU (JARAK JAUH)", fill="#F472B6", font=ImageFont.truetype("arialbd.ttf", 26), anchor="mm")
        draw.ellipse([right_box[0] + 25, mock_y + 60, right_box[0] + 45, mock_y + 80], fill=(34, 197, 94, 255))
        
        # User 2 silhouette icon
        draw.ellipse([WIDTH*3//4 - 50, mock_y + 240, WIDTH*3//4 + 50, mock_y + 340], fill=(236, 72, 153, 100))
        draw.ellipse([WIDTH*3//4 - 80, mock_y + 360, WIDTH*3//4 + 80, mock_y + 500], fill=(236, 72, 153, 80))

        # Synchronized Flash effect pulse
        flash_phase = (scene_t * 6) % 1.0
        if flash_phase < 0.15:
            flash_alpha = int(255 * (1.0 - flash_phase / 0.15) * 0.4)
            draw.rectangle([70, mock_y, WIDTH - 70, mock_y + 680], fill=(255, 255, 255, flash_alpha))

        # Floating Feature Pills below
        pill_y = int(mock_y + 730)
        draw_smooth_card(draw, [110, pill_y, WIDTH - 110, pill_y + 90], (24, 24, 27, 230), (244, 63, 94, 180), 2, 25)
        draw.text((WIDTH//2, pill_y + 45), "⚡ WebRTC P2P • Auto-Sync Jepret Realtime", fill="#FFFFFF", font=ImageFont.truetype("arialbd.ttf", 30), anchor="mm")

        pill2_y = pill_y + 115
        draw_smooth_card(draw, [110, pill2_y, WIDTH - 110, pill2_y + 90], (24, 24, 27, 230), (59, 130, 246, 180), 2, 25)
        draw.text((WIDTH//2, pill2_y + 45), "📸 Frame Anti-Gepeng & Pilihan Filter Keren", fill="#67E8F9", font=ImageFont.truetype("arialbd.ttf", 30), anchor="mm")

    elif t < 21.5:
        # --- SCENE 3: TOOLS & UTILITY SUITE (14.0 - 21.5s) ---
        scene_t = (t - 14.0) / 7.5
        
        head_p = min(1.0, scene_t / 0.15)
        head_y = 150 + ease_out_cubic(head_p) * 100
        draw.text((WIDTH//2, int(head_y)), "ALL-IN-ONE UTILITIES 🛠️", fill="#38BDF8", font=ImageFont.truetype("arialbd.ttf", 32), anchor="mm")
        draw.text((WIDTH//2, int(head_y + 75)), "Semua Alat Dalam Satu Web", fill="#FFFFFF", font=ImageFont.truetype("arialbd.ttf", 56), anchor="mm")

        # 3 Sliding Feature Cards (Staggered animation)
        cards = [
            ("📥 Video & Audio Downloader", "Unduh video TikTok, IG, YT kualitas HD tanpa watermark", (59, 130, 246), 0.0),
            ("🗜️ Image & Video Compressor", "Kecilkan ukuran file hingga 80% tanpa merusak kualitas", (16, 185, 129), 0.15),
            ("🔄 Universal File Converter", "Konversi gambar, video & dokumen super cepat dan instan", (245, 158, 11), 0.30),
        ]
        
        start_y = int(head_y + 190)
        for idx, (title, desc, col, delay) in enumerate(cards):
            card_p = min(1.0, max(0.0, (scene_t - delay) / 0.2))
            c_x = int(-WIDTH + ease_out_back(card_p) * (WIDTH + 80))
            c_y = start_y + idx * 240
            
            draw_smooth_card(draw, [80, c_y, WIDTH - 80, c_y + 190], (24, 24, 27, 230), col, 3, 30)
            
            # Left accent bar
            draw.rounded_rectangle([80, c_y, 100, c_y + 190], radius=15, fill=col)
            
            draw.text((130, c_y + 60), title, fill="#FFFFFF", font=ImageFont.truetype("arialbd.ttf", 38), anchor="lm")
            draw.text((130, c_y + 125), desc, fill="#94A3B8", font=ImageFont.truetype("arial.ttf", 26), anchor="lm")

    else:
        # --- SCENE 4: CALL TO ACTION OUTRO (21.5 - 28.0s) ---
        scene_t = (t - 21.5) / 6.5
        
        scale_p = min(1.0, scene_t / 0.25)
        pulse = 10 * math.sin(t * 6.0)
        
        # Outro Big Glowing Card
        main_box = [80, int(450 + pulse), WIDTH - 80, int(1350 + pulse)]
        draw_smooth_card(draw, main_box, (15, 23, 42, 245), (139, 92, 246, 255), 4, 40)
        
        draw.text((WIDTH//2, main_box[1] + 130), "COBA SEKARANG GRATIS", fill="#C084FC", font=ImageFont.truetype("arialbd.ttf", 38), anchor="mm")
        draw.text((WIDTH//2, main_box[1] + 250), "Buka Lewat Browser:", fill="#FFFFFF", font=ImageFont.truetype("arialbd.ttf", 52), anchor="mm")
        
        # Massive URL Badge with breathing glow
        url_box = [130, main_box[1] + 370, WIDTH - 130, main_box[1] + 530]
        draw_smooth_card(draw, url_box, (139, 92, 246, 255), (255, 255, 255, 255), 4, 32)
        draw.text((WIDTH//2, main_box[1] + 450), "bajza.my.id", fill="#FFFFFF", font=ImageFont.truetype("arialbd.ttf", 74), anchor="mm")

        draw.text((WIDTH//2, main_box[1] + 640), "Tanpa Unduh Aplikasi • Langsung Pakai", fill="#CBD5E1", font=ImageFont.truetype("arial.ttf", 34), anchor="mm")
        draw.text((WIDTH//2, main_box[1] + 740), "Karya Kreatif Mochamad Alfan C.", fill="#64748B", font=ImageFont.truetype("arial.ttf", 28), anchor="mm")

    # Save rendered frame
    frame_path = os.path.join(TEMP_DIR, f"frame_{i:04d}.png")
    bg.convert("RGB").save(frame_path)
    if i % 120 == 0:
        print(f"Rendered {i}/{TOTAL_FRAMES} frames ({t:.1f}s)")

print("All frames rendered successfully! Running FFmpeg export...")

# Encode to 60fps / 30fps high quality MP4 with AAC TikTok audio
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
print(f"High-quality promo video created successfully at: {OUTPUT_PATH}")
