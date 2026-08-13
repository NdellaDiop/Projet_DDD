#!/usr/bin/env python3
"""Génère l'image Figure 3.2 — arborescence du projet."""

from PIL import Image, ImageDraw, ImageFont

OUTPUT = "/home/ndella/Documents/Projet_DDD/DDD/docs/captures/fig_3_2_arborescence.png"

TREE = """DDD/
├── dddback/                    ← API Laravel (PHP)
│   ├── app/
│   │   ├── Http/Controllers/
│   │   ├── Models/
│   │   ├── Services/
│   │   └── Policies/
│   ├── config/
│   ├── database/migrations/
│   ├── routes/api.php
│   └── composer.json
│
└── dddfront/                   ← Client React (Node.js)
    ├── src/
    │   ├── pages/
    │   ├── components/
    │   ├── context/AuthContext.tsx
    │   └── lib/
    ├── package.json            ← dépendances npm
    ├── vite.config.ts          ← serveur de dev Vite
    └── tailwind.config.ts"""


def main():
    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
    font = ImageFont.truetype(font_path, 14)
    title_font = ImageFont.truetype(
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 15
    )

    lines = TREE.split("\n")
    line_h = 20
    pad_x, pad_y = 24, 28
    width = 720
    height = pad_y * 2 + line_h * len(lines) + 36

    img = Image.new("RGB", (width, height), "#f8fafc")
    draw = ImageDraw.Draw(img)

    # cadre
    draw.rectangle([0, 0, width - 1, height - 1], outline="#94a3b8", width=2)

    # titre interne
    draw.text((pad_x, 10), "Arborescence du projet — deux dépôts distincts", fill="#1a365d", font=title_font)

    y = pad_y + 18
    for line in lines:
        color = "#1e293b"
        if "dddback" in line and "←" in line:
            color = "#1d4ed8"
        elif "dddfront" in line and "←" in line:
            color = "#047857"
        elif "Node.js" in line or "npm" in line or "Vite" in line:
            color = "#047857"
        draw.text((pad_x, y), line, fill=color, font=font)
        y += line_h

    img.save(OUTPUT)
    print(f"Image générée : {OUTPUT}")


if __name__ == "__main__":
    main()
