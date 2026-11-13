/**
 * Draws the app icon and writes every size the PWA needs.
 * The artwork is original (simple shapes), so there is nothing to license.
 *
 * Usage: npm run data:icons
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * @param inset  how far the artwork is from the edge (maskable icons need more)
 * @param radius corner radius of the background (0 = full square)
 */
function iconSvg(inset: number, radius: number): string {
  const s = (512 - inset * 2) / 512;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#123329"/>
      <stop offset="0.55" stop-color="#0b1620"/>
      <stop offset="1" stop-color="#090d13"/>
    </linearGradient>
    <linearGradient id="pawn" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6ee7b7"/>
      <stop offset="1" stop-color="#10b981"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${radius}" fill="url(#bg)"/>
  <g transform="translate(${inset} ${inset}) scale(${s})">
    <!-- board corner -->
    <g opacity="0.16" fill="#34d399">
      <rect x="64" y="320" width="96" height="96" rx="10"/>
      <rect x="160" y="224" width="96" height="96" rx="10"/>
      <rect x="352" y="320" width="96" height="96" rx="10"/>
      <rect x="256" y="128" width="96" height="96" rx="10"/>
      <rect x="352" y="128" width="96" height="96" rx="10" opacity="0.5"/>
      <rect x="64" y="128" width="96" height="96" rx="10" opacity="0.5"/>
    </g>
    <!-- pawn -->
    <g fill="url(#pawn)">
      <circle cx="256" cy="150" r="62"/>
      <path d="M200 214h112c8 0 14 6 14 14s-6 14-14 14h-18c4 62 26 100 62 128H156c36-28 58-66 62-128h-18c-8 0-14-6-14-14s6-14 14-14z"/>
      <rect x="128" y="382" width="256" height="50" rx="20"/>
    </g>
  </g>
</svg>`;
}

async function png(svg: string, size: number, file: string, flatten = false) {
  let image = sharp(Buffer.from(svg)).resize(size, size);
  if (flatten) image = image.flatten({ background: "#090d13" });
  const out = resolve(root, file);
  mkdirSync(dirname(out), { recursive: true });
  await image.png().toFile(out);
  console.log(`✓ ${file}`);
}

async function main() {
  const rounded = iconSvg(40, 112);
  const square = iconSvg(40, 0);
  const maskable = iconSvg(96, 0);

  await png(rounded, 192, "public/icons/icon-192.png");
  await png(rounded, 512, "public/icons/icon-512.png");
  await png(maskable, 192, "public/icons/icon-maskable-192.png", true);
  await png(maskable, 512, "public/icons/icon-maskable-512.png", true);
  // iOS adds its own rounded corners and does not allow transparency.
  await png(square, 180, "public/apple-touch-icon.png", true);
  writeFileSync(resolve(root, "src/app/icon.svg"), rounded);
  console.log("✓ src/app/icon.svg");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
