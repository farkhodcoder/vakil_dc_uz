// Statik eksportdan keyin: Next 16 segment-prefetch fayllarini ichma-ich papkalarga yozadi
//   uz/mashq/__next.$d$lang/mashq/__PAGE__.txt
// brauzer esa ularni tekis nom bilan so'raydi
//   uz/mashq/__next.$d$lang.mashq.__PAGE__.txt
// Shu sababli har bir faylning tekis nomli nusxasini yaratamiz (aks holda har o'tishda 404 va qayta so'rov).
import { copyFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outDir = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), "out");

async function walk(dir, visit) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith("__next.")) await visit(full);
      else if (entry.name !== "_next") await walk(full, visit);
    }
  }
}

async function filesUnder(dir, prefix = []) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const parts = [...prefix, entry.name];
    if (entry.isDirectory()) out.push(...(await filesUnder(path.join(dir, entry.name), parts)));
    else out.push(parts);
  }
  return out;
}

let count = 0;
await stat(outDir);
await walk(outDir, async (segmentDir) => {
  const parent = path.dirname(segmentDir);
  const head = path.basename(segmentDir); // "__next.$d$lang"
  for (const parts of await filesUnder(segmentDir)) {
    await copyFile(path.join(segmentDir, ...parts), path.join(parent, [head, ...parts].join(".")));
    count++;
  }
});
console.log(`flatten-segments: ${count} ta fayl`);
