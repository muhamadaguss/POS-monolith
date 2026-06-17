// Generator ikon PWA Kasirku — render dari SVG brand ("K" putih di kotak emerald)
// ke PNG 192/512/maskable/apple-touch. Jalankan: node scripts/generate-pwa-icons.mjs
// Output: public/icons/*.png. Reproducible — aman dijalankan ulang.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const EMERALD = '#059669';
const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/icons');

/** SVG logo: kotak rounded emerald + huruf "K" putih di tengah.
 *  `pad` = rasio padding aman untuk ikon maskable (0 = penuh tepi). */
function svg(size, pad = 0) {
  const inset = Math.round(size * pad);
  const box = size - inset * 2;
  const radius = Math.round(box * 0.22);
  const fontSize = Math.round(box * 0.62);
  // Background penuh agar maskable tak transparan saat di-crop bulat.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${EMERALD}"/>
  <rect x="${inset}" y="${inset}" width="${box}" height="${box}" rx="${radius}" fill="${EMERALD}"/>
  <text x="50%" y="50%" dy="0.04em" text-anchor="middle" dominant-baseline="central"
        font-family="Arial, Helvetica, sans-serif" font-weight="700"
        font-size="${fontSize}" fill="#ffffff">K</text>
</svg>`;
}

async function render(name, size, pad) {
  const buf = Buffer.from(svg(size, pad));
  await sharp(buf).png().toFile(path.join(outDir, name));
  console.log('✓', name, `${size}x${size}`);
}

await mkdir(outDir, { recursive: true });
await render('icon-192.png', 192, 0);
await render('icon-512.png', 512, 0);
await render('icon-maskable-512.png', 512, 0.12); // padding aman adaptive icon
await render('apple-touch-icon.png', 180, 0);
console.log('Selesai → public/icons/');
