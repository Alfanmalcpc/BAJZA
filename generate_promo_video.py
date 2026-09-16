import os
import subprocess
from PIL import Image, ImageDraw, ImageFont

WIDTH = 1080
HEIGHT = 1920
FPS = 30
OUTPUT_PATH = r"C:\Users\ACER\Downloads\BAJA_WEB_Promo_916.mp4"
TEMP_DIR = r"C:\Users\ACER\AppData\Local\Temp\baja_promo_frames"
os.makedirs(TEMP_DIR, exist_ok=True)

# Helper to draw a modern card
def draw_card(draw, box, bg_color, border_color="#000000", radius=32, shadow=True):
    x1, y1, x2, y2 = box
    if shadow:
        # Draw neo-brutalist hard shadow
        shadow_box = [x1 + 12, y1 + 12, x2 + 12, y2 + 12]
        draw.rounded_rectangle(shadow_box, radius=radius, fill="#000000")
    draw.rounded_rectangle(box, radius=radius, fill=bg_color, outline=border_color, width=6)

print("Generating promo video frames...")

# We will generate frames for 4 scenes (total ~27 seconds = ~810 frames at 30fps)
# Scene 1: Intro (0 - 6s = 180 frames)
# Scene 2: Photobooth Multiplayer (6 - 13s = 210 frames)
# Scene 3: Downloader & Tools (13 - 20s = 210 frames)
# Scene 4: Outro CTA (20 - 27s = 210 frames)

try:
    font_title = ImageFont.truetype("arial.ttf", 72)
    font_sub = ImageFont.truetype("arial.ttf", 36)
    font_bold = ImageFont.truetype("arial.ttf", 52)
except:
    font_title = ImageFont.load_default()
    font_sub = ImageFont.load_default()
    font_bold = ImageFont.load_default()

total_frames = 810
frame_idx = 0

for i in range(total_frames):
    # Base background gradient simulation (Dark Navy / Purple SaaS vibe)
    img = Image.new("RGBA", (WIDTH, HEIGHT), (15, 23, 42, 255))
    draw = ImageDraw.Draw(img)
    
    # Decorative background glowing blobs
    draw.ellipse([100, 200, 600, 700], fill=(59, 130, 246, 40))
    draw.ellipse([500, 1200, 1000, 1700], fill=(236, 72, 153, 40))

    if i < 180:
        # --- SCENE 1: INTRO ---
        # Floating Header Card
        draw_card(draw, [100, 400, WIDTH - 100, 900], "#1e293b", "#3b82f6", 40)
        draw.text((WIDTH//2, 500), "PLATFORM WEB ALL-IN-ONE", fill="#3b82f6", font=font_sub, anchor="mm")
        draw.text((WIDTH//2, 620), "BAJA WEB", fill="#ffffff", font=ImageFont.truetype("arial.ttf", 96), anchor="mm")
        draw.text((WIDTH//2, 750), "Solusi Gabut & Produktif Jadi Satu 🚀", fill="#cbd5e1", font=font_sub, anchor="mm")

        # Floating Feature Badge
        draw_card(draw, [200, 1050, WIDTH - 200, 1250], "#0f172a", "#10b981", 30)
        draw.text((WIDTH//2, 1150), "✨ 100% Gratis & Tanpa Install", fill="#10b981", font=font_bold, anchor="mm")

    elif i < 390:
        # --- SCENE 2: PHOTOBOOTH MULTIPLAYER ---
        # Header
        draw.text((WIDTH//2, 250), "🔥 FITUR UNGGULAN", fill="#f43f5e", font=font_sub, anchor="mm")
        draw.text((WIDTH//2, 340), "Photobooth Multiplayer", fill="#ffffff", font=font_title, anchor="mm")

        # Mockup Preview Card (Split screen simulation)
        draw_card(draw, [80, 460, WIDTH - 80, 1100], "#ffffff", "#000000", 36)
        draw.rectangle([110, 520, WIDTH//2 - 20, 1040], fill="#e2e8f0")
        draw.rectangle([WIDTH//2 + 20, 520, WIDTH - 110, 1040], fill="#cbd5e1")
        draw.text((WIDTH//2, 780), "📸 Real-Time P2P Sync", fill="#0f172a", font=font_bold, anchor="mm")

        # Bullet points card
        draw_card(draw, [100, 1200, WIDTH - 100, 1650], "#1e293b", "#f43f5e", 32)
        draw.text((WIDTH//2, 1290), "✔️ Main Bareng Teman Jarak Jauh", fill="#fecdd3", font=font_sub, anchor="mm")
        draw.text((WIDTH//2, 1380), "✔️ Sinkronisasi Jepretan Otomatis", fill="#fecdd3", font=font_sub, anchor="mm")
        draw.text((WIDTH//2, 1470), "✔️ Pilihan Tema & Strip Estetik", fill="#fecdd3", font=font_sub, anchor="mm")

    elif i < 600:
        # --- SCENE 3: DOWNLOADER & TOOLS ---
        draw.text((WIDTH//2, 250), "⚡ ALAT UTILITY LENGKAP", fill="#3b82f6", font=font_sub, anchor="mm")
        draw.text((WIDTH//2, 340), "Downloader & Converter", fill="#ffffff", font=font_title, anchor="mm")

        # Grid Cards
        draw_card(draw, [100, 480, WIDTH - 100, 850], "#1e293b", "#3b82f6", 32)
        draw.text((WIDTH//2, 570), "📥 Video Downloader", fill="#60a5fa", font=font_bold, anchor="mm")
        draw.text((WIDTH//2, 680), "Unduh video kualitas HD tanpa watermark", fill="#94a3b8", font=font_sub, anchor="mm")

        draw_card(draw, [100, 930, WIDTH - 100, 1300], "#1e293b", "#10b981", 32)
        draw.text((WIDTH//2, 1020), "🗜️ Kompresor & Konverter", fill="#34d399", font=font_bold, anchor="mm")
        draw.text((WIDTH//2, 1130), "Ubah format file instan & hemat penyimpanan", fill="#94a3b8", font=font_sub, anchor="mm")

    else:
        # --- SCENE 4: OUTRO CTA ---
        draw_card(draw, [100, 450, WIDTH - 100, 1150], "#0f172a", "#8b5cf6", 40)
        draw.text((WIDTH//2, 580), "Tunggu Apa Lagi?", fill="#a78bfa", font=font_title, anchor="mm")
        draw.text((WIDTH//2, 700), "Coba Sekarang Juga!", fill="#ffffff", font=ImageFont.truetype("arial.ttf", 64), anchor="mm")
        
        # Link CTA Badge
        draw_card(draw, [180, 850, WIDTH - 180, 1020], "#8b5cf6", "#ffffff", 30, shadow=False)
        draw.text((WIDTH//2, 935), "baja.onrender.com", fill="#ffffff", font=font_bold, anchor="mm")

        draw.text((WIDTH//2, 1400), "Platform Gabut Paling Produktif ✨", fill="#64748b", font=font_sub, anchor="mm")

    # Save frame
    frame_filename = os.path.join(TEMP_DIR, f"frame_{i:04d}.png")
    img.convert("RGB").save(frame_filename)
    if i % 100 == 0:
        print(f"Generated frame {i}/{total_frames}")

print("Frames generated successfully!")
