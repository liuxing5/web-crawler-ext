# 把 tools/_frames/gif/f_*.png 拼成演示 GIF
# 用法: python tools/make-gif.py   → store/promo/demo.gif
import glob
import os
import sys

from PIL import Image

W = 960                 # 输出宽度（1280 → 960，控体积）
COLORS = 128
DURATION = 100          # 每帧 100ms → 10fps，与录制步进一致
MAX_BYTES = 6 * 1024 * 1024

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRAMES = os.path.join(ROOT, 'tools', '_frames', 'gif', 'f_*.png')
OUT_DIR = os.path.join(ROOT, 'store', 'promo')


def main():
    files = sorted(glob.glob(FRAMES))
    if not files:
        print('no frames:', FRAMES)
        sys.exit(1)

    ims = []
    for f in files:
        im = Image.open(f).convert('RGB')
        h = round(im.height * W / im.width)
        im = im.resize((W, h), Image.LANCZOS)
        ims.append(im.convert('P', palette=Image.ADAPTIVE, colors=COLORS))

    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, 'demo.gif')
    ims[0].save(
        out, save_all=True, append_images=ims[1:],
        duration=DURATION, loop=0, optimize=True, disposal=2,
    )
    size = os.path.getsize(out)
    print(f'{out}  frames={len(ims)}  {W}x{ims[0].height}  {size/1024/1024:.2f} MB')

    if size > MAX_BYTES:
        print('too big -> 降级：宽度 800 / 96 色 重拼')
        ims2 = []
        for f in files:
            im = Image.open(f).convert('RGB')
            h = round(im.height * 800 / im.width)
            ims2.append(im.resize((800, h), Image.LANCZOS).convert('P', palette=Image.ADAPTIVE, colors=96))
        ims2[0].save(out, save_all=True, append_images=ims2[1:],
                     duration=DURATION, loop=0, optimize=True, disposal=2)
        print(f'rebuilt: {os.path.getsize(out)/1024/1024:.2f} MB')


if __name__ == '__main__':
    main()
