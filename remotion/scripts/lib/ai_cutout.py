#!/usr/bin/env python3
"""
Détourage IA d'un packshot (modèle u2net via rembg).

Lit une image sur l'entrée standard, écrit un PNG transparent sur la sortie standard.
Contrairement au remplissage par couleur, le modèle reconnaît le produit : il enlève
aussi le sol, le reflet et l'ombre portée du studio (la « bande blanche » sous les
chaussures) et ne laisse aucun cadre autour de l'image.

Post-traitement :
  - alpha < 24 → 0 (supprime le voile quasi invisible qui dessinait un rectangle
    une fois l'ombre portée appliquée dans la vidéo)
  - recadrage serré sur le produit + marge transparente de 6 %
"""
import io
import sys

from PIL import Image
from rembg import new_session, remove


def main() -> None:
    src = Image.open(io.BytesIO(sys.stdin.buffer.read())).convert("RGBA")
    # Fond blanc sous les éventuelles zones déjà transparentes.
    flat = Image.new("RGBA", src.size, (255, 255, 255, 255))
    flat.alpha_composite(src)
    out = remove(flat.convert("RGB"), session=new_session("u2net"))

    alpha = out.getchannel("A").point(lambda a: 0 if a < 24 else (255 if a > 235 else a))
    out.putalpha(alpha)
    bbox = alpha.getbbox()
    if not bbox:
        sys.stderr.write("aucun produit détecté\n")
        sys.exit(2)
    out = out.crop(bbox)
    margin = int(max(out.size) * 0.06)
    canvas = Image.new("RGBA", (out.width + 2 * margin, out.height + 2 * margin), (255, 255, 255, 0))
    canvas.paste(out, (margin, margin))
    buf = io.BytesIO()
    canvas.save(buf, format="PNG", optimize=True)
    sys.stdout.buffer.write(buf.getvalue())


if __name__ == "__main__":
    main()
