from PIL import Image
from pathlib import Path

src = Path('icons/mana.png')
out_dir = Path('icons')
out_dir.mkdir(exist_ok=True)

img = Image.open(src)
width, height = img.size

cols = 10
rows = 7
cell_w = width // cols
cell_h = height // rows

# icons 5,6,7,8,9 from row 3 (0-based row index 2)
row_index = 2
source_cols = [4, 5, 6, 7, 8]
name_map = ['W', 'U', 'B', 'R', 'G']

for name, col in zip(name_map, source_cols):
    left = col * cell_w
    top = row_index * cell_h
    right = left + cell_w
    bottom = top + cell_h

    cropped = img.crop((left, top, right, bottom))
    cropped.save(out_dir / f'{name}.png')

# also split full sheet into 70 individual icons
for row in range(rows):
    for col in range(cols):
        left = col * cell_w
        top = row * cell_h
        right = left + cell_w
        bottom = top + cell_h

        cropped = img.crop((left, top, right, bottom))
        cropped.save(out_dir / f'{row + 1}_{col + 1}.png')

print(f'Split {src} into {rows * cols} icons and extracted W,U,B,R,G from row 3.')
