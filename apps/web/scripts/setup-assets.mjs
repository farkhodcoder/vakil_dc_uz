// Brauzer uchun statik fayllar (gitga qo'shilmaydi, o'zimizdan beriladi — uchinchi tomon serverlarisiz):
//  • public/mediapipe — MediaPipe WASM va modellar (foto tahlili). Modellar SHA-256 bilan tekshiriladi.
//  • public/fonts     — PDF namuna uchun Noto Sans TTF (lotin, kirill, o'zbek Қ/Ғ/Ҳ, turk harflari).
// Fayl joyida va to'g'ri bo'lsa qayta yuklanmaydi/ko'chirilmaydi.
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(appRoot, "public", "mediapipe");
const wasmSrc = path.join(appRoot, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const fontsDir = path.join(appRoot, "public", "fonts");
const fontsSrc = path.join(appRoot, "node_modules", "@expo-google-fonts", "noto-sans");

const FONTS = [
  { from: "400Regular/NotoSans_400Regular.ttf", to: "NotoSans-Regular.ttf" },
  { from: "700Bold/NotoSans_700Bold.ttf", to: "NotoSans-Bold.ttf" },
];

// FilesetResolver.forVisionTasks() SIMD yoki nosimd variantini tanlaydi
const WASM_FILES = [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
];

const MODELS = [
  {
    file: "face_landmarker.task",
    url: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
    sha256: "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff",
  },
  {
    file: "selfie_segmenter.tflite",
    url: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite",
    sha256: "191ac9529ae506ee0beefa6b2c945a172dab9d07d1e802a290a4e4038226658b",
  },
];

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

async function sameSize(a, b) {
  try {
    const [sa, sb] = await Promise.all([stat(a), stat(b)]);
    return sa.size === sb.size;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(path.join(outDir, "wasm"), { recursive: true });
  await mkdir(fontsDir, { recursive: true });

  for (const font of FONTS) {
    const from = path.join(fontsSrc, font.from);
    const to = path.join(fontsDir, font.to);
    if (!(await sameSize(from, to))) await copyFile(from, to);
  }

  for (const name of WASM_FILES) {
    const from = path.join(wasmSrc, name);
    const to = path.join(outDir, "wasm", name);
    if (!(await sameSize(from, to))) await copyFile(from, to);
  }

  for (const model of MODELS) {
    const target = path.join(outDir, model.file);
    try {
      if (sha256(await readFile(target)) === model.sha256) continue;
    } catch {
      // fayl yo'q — yuklaymiz
    }
    const res = await fetch(model.url);
    if (!res.ok) throw new Error(`${model.file}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (sha256(buf) !== model.sha256) {
      throw new Error(`${model.file}: SHA-256 mos kelmadi — fayl saqlanmadi`);
    }
    await writeFile(target, buf);
    console.log(`mediapipe: ${model.file} yuklandi`);
  }
}

main().catch((err) => {
  console.error(`setup-assets: ${err.message}`);
  process.exit(1);
});
