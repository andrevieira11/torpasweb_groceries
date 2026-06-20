// Rasterize the app mark (src/app/icon.svg) into the PWA PNG icons in public/.
// Run after changing the icon:  node ops/make-icons.mjs   (needs the sharp devDep)
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = await readFile(join(root, "src/app/icon.svg"));
const pub = join(root, "public");

const targets = [
  [192, "icon-192.png"],
  [512, "icon-512.png"],
  [512, "icon-maskable.png"],
  [180, "apple-icon.png"],
];

for (const [size, name] of targets) {
  await sharp(svg).resize(size, size).png().toFile(join(pub, name));
  console.log(`wrote public/${name} (${size}px)`);
}
