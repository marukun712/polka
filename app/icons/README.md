# Icons

This directory should contain icon files for the extension:

- `icon-16.png` - 16x16 pixel icon
- `icon-32.png` - 32x32 pixel icon
- `icon-48.png` - 48x48 pixel icon
- `icon-128.png` - 128x128 pixel icon

You can generate these icons using any image editor or icon generator.

For now, you can use placeholder SVG icons converted to PNG, or create simple colored squares as placeholders.

Example command to create placeholder icons (requires ImageMagick):
```bash
convert -size 16x16 xc:#667eea icon-16.png
convert -size 32x32 xc:#667eea icon-32.png
convert -size 48x48 xc:#667eea icon-48.png
convert -size 128x128 xc:#667eea icon-128.png
```
