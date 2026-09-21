import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/zcb-logo.svg');
const publicDir = path.resolve('public');

async function generate() {
  const svgBuffer = fs.readFileSync(svgPath);

  // 192x192 PNG
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // Apple touch icon 180x180 PNG
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // Maskable 512x512 with safe padding (80% size centered on background)
  const innerSize = Math.round(512 * 0.8);
  const innerBuffer = await sharp(svgBuffer)
    .resize(innerSize, innerSize)
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: '#FED800' // Matches ZCB brand yellow
    }
  })
    .composite([
      {
        input: innerBuffer,
        top: Math.round((512 - innerSize) / 2),
        left: Math.round((512 - innerSize) / 2)
      }
    ])
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  console.log('PWA icons successfully generated in public directory!');
}

generate().catch(console.error);
