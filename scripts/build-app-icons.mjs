// Render the PWA / home-screen icons from assets/icons/app-icon.svg.
// Run: node scripts/build-app-icons.mjs
import sharp from 'sharp';

const src = new URL('../assets/icons/app-icon.svg', import.meta.url);
const out = name => new URL(`../public/icons/${name}`, import.meta.url).pathname;
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180], ['favicon-32.png', 32]]) {
  await sharp(src.pathname, { density: 300 }).resize(size, size).png().toFile(out(name));
  console.log('wrote', name);
}
