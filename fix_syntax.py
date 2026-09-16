import re

html_path = r"C:/Users/ACER/Documents/dokumen Alfan/BAJA WEB/frontend/src/pages/tools/downloader.html"
with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

html = re.sub(r'" id="topDlOptBtn.*?\}\s*function renderServices', 'function renderServices', html, flags=re.DOTALL)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)
