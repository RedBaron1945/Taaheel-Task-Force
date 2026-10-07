#!/usr/bin/env python3
"""
Generate all public/ icon assets from branding/taaheel-logo.png
"""
import os
import shutil

def main():
    logo_path = 'branding/taaheel-logo.png'
    if not os.path.exists(logo_path):
        print(f"Error: {logo_path} not found")
        return

    os.makedirs('public', exist_ok=True)
    os.makedirs('src/assets/images', exist_ok=True)
    shutil.copyfile(logo_path, 'src/assets/images/taaheel-logo.png')

    try:
        from PIL import Image
        im = Image.open(logo_path).convert('RGBA')

        # Generate public/logo.png
        im.resize((512, 512), Image.Resampling.LANCZOS).save('public/logo.png', format='PNG')
        im.resize((512, 512), Image.Resampling.LANCZOS).save('public/whatsapp-share.png', format='PNG')
        shutil.copyfile('public/whatsapp-share.png', 'public/logo-share.png')

        # PWA icons
        im.resize((192, 192), Image.Resampling.LANCZOS).save('public/pwa-192x192.png', format='PNG')
        im.resize((512, 512), Image.Resampling.LANCZOS).save('public/pwa-512x512.png', format='PNG')

        # Apple touch icon
        im.resize((180, 180), Image.Resampling.LANCZOS).save('public/apple-touch-icon.png', format='PNG')

        # Favicons
        im.resize((32, 32), Image.Resampling.LANCZOS).save('public/favicon-32x32.png', format='PNG')
        im.resize((16, 16), Image.Resampling.LANCZOS).save('public/favicon-16x16.png', format='PNG')
        im.resize((32, 32), Image.Resampling.LANCZOS).save('public/favicon.ico', format='ICO')

        # OG Image (1200x630 banner with centered logo on pure white background)
        og = Image.new('RGBA', (1200, 630), (255, 255, 255, 255))
        logo_og = im.resize((480, 480), Image.Resampling.LANCZOS)
        og.paste(logo_og, ((1200 - 480) // 2, (630 - 480) // 2), logo_og)
        og.save('public/og-image.png', format='PNG')

        print("All icons generated successfully from branding/taaheel-logo.png")
    except ImportError:
        # Fallback if Pillow is not installed
        shutil.copyfile(logo_path, 'public/logo.png')
        if os.path.exists('branding/whatsapp-share.png'):
            shutil.copyfile('branding/whatsapp-share.png', 'public/whatsapp-share.png')
            shutil.copyfile('branding/whatsapp-share.png', 'public/logo-share.png')
        if os.path.exists('branding/og-image.png'):
            shutil.copyfile('branding/og-image.png', 'public/og-image.png')
        print("Pillow not installed; copied base assets from branding/")

if __name__ == '__main__':
    main()
