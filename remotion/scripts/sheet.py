# usage: python sheet.py out.jpg prefix f1,f2,... [cols]  -> labelled contact sheet of stills prefix<f>.jpg
import sys
from PIL import Image, ImageDraw
out, pre, fr = sys.argv[1], sys.argv[2], [int(x) for x in sys.argv[3].split(",")]
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 6
ims = [Image.open(f"{pre}{f}.jpg") for f in fr]
w, h = ims[0].size; w2, h2 = w // 2, h // 2
rows = (len(ims) + cols - 1) // cols
S = Image.new("RGB", (cols * w2, rows * h2), "white"); d = ImageDraw.Draw(S)
for i, (f, im) in enumerate(zip(fr, ims)):
    x, y = (i % cols) * w2, (i // cols) * h2
    S.paste(im.resize((w2, h2)), (x, y)); d.rectangle([x, y, x + 60, y + 18], fill="black"); d.text((x + 4, y + 3), str(f), fill="white")
S.save(out, quality=88)
