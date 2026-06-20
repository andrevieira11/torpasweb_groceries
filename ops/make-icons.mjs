// Rasterize the app mark (src/app/icon.svg) into the PWA PNG icons in public/
// and the browser favicon.ico in src/app/.
// Run after changing the icon:  node ops/make-icons.mjs   (needs sharp + png-to-ico devDeps)
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = await readFile(join(root, "src/app/icon.svg"));
const pub = join(root, "public");

const pngs = [
  [192, "icon-192.png"],
  [512, "icon-512.png"],
  [512, "icon-maskable.png"],
  [180, "apple-icon.png"],
];
for (const [size, name] of pngs) {
  await sharp(svg).resize(size, size).png().toFile(join(pub, name));
  console.log(`wrote public/${name} (${size}px)`);
}

// Multi-size favicon.ico (the Next app/favicon.ico convention → served at /favicon.ico).
const icoBuffers = await Promise.all(
  [16, 32, 48].map((s) => sharp(svg).resize(s, s).png().toBuffer()),
);
await writeFile(join(root, "src/app/favicon.ico"), await pngToIco(icoBuffers));
console.log("wrote src/app/favicon.ico (16/32/48)");
