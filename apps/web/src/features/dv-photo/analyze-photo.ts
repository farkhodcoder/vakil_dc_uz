// Brauzerda ishlaydi. Rasm hech qayerga yuborilmaydi: MediaPipe modellari
// ilovaning o'zidan (/mediapipe) yuklanadi va tahlil qurilmada bajariladi.
import type { FaceLandmarker, ImageSegmenter } from "@mediapipe/tasks-vision";
import {
  backgroundStats,
  faceGeometry,
  hasJpegSignature,
  headTopFromMask,
  type PhotoFacts,
} from "@vakil/dv-photo";

/** Katta telefon fotolarini tahlil uchun kichraytiramiz — foizlar o'zgarmaydi */
const MAX_ANALYSIS_SIDE = 1024;

interface Engine {
  face: FaceLandmarker;
  segmenter: ImageSegmenter;
}

type Fileset = Awaited<ReturnType<typeof import("@mediapipe/tasks-vision").FilesetResolver.forVisionTasks>>;

let filesetPromise: Promise<Fileset> | null = null;

function loadFileset(): Promise<Fileset> {
  if (!filesetPromise) {
    filesetPromise = import("@mediapipe/tasks-vision")
      .then(({ FilesetResolver }) => FilesetResolver.forVisionTasks("/mediapipe/wasm"))
      .catch((err: unknown) => {
        filesetPromise = null;
        throw err;
      });
  }
  return filesetPromise;
}

let enginePromise: Promise<Engine> | null = null;

export function loadEngine(): Promise<Engine> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const { FaceLandmarker, ImageSegmenter } = await import("@mediapipe/tasks-vision");
      const fileset = await loadFileset();
      const [face, segmenter] = await Promise.all([
        FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task", delegate: "CPU" },
          runningMode: "IMAGE",
          numFaces: 3, // bittadan ko'p yuzni ham aniqlash uchun
        }),
        ImageSegmenter.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: "/mediapipe/selfie_segmenter.tflite", delegate: "CPU" },
          runningMode: "IMAGE",
          outputConfidenceMasks: true,
          outputCategoryMask: false,
        }),
      ]);
      return { face, segmenter };
    })().catch((err: unknown) => {
      enginePromise = null; // keyingi urinishda qayta yuklash
      throw err;
    });
  }
  return enginePromise;
}

let videoPromise: Promise<FaceLandmarker> | null = null;

/** Kamera uchun jonli rejimdagi yuz aniqlagich (alohida nusxa: runningMode VIDEO) */
export function loadVideoLandmarker(): Promise<FaceLandmarker> {
  if (!videoPromise) {
    videoPromise = (async () => {
      const { FaceLandmarker } = await import("@mediapipe/tasks-vision");
      const fileset = await loadFileset();
      return FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task", delegate: "CPU" },
        runningMode: "VIDEO",
        numFaces: 2,
      });
    })().catch((err: unknown) => {
      videoPromise = null;
      throw err;
    });
  }
  return videoPromise;
}

function resizeMask(src: Float32Array, sw: number, sh: number, dw: number, dh: number): Float32Array {
  const out = new Float32Array(dw * dh);
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(sh - 1, Math.floor((y * sh) / dh));
    for (let x = 0; x < dw; x++) {
      out[y * dw + x] = src[sy * sw + Math.min(sw - 1, Math.floor((x * sw) / dw))] ?? 0;
    }
  }
  return out;
}

/** Yuz ichidagi o'rtacha ishonch past bo'lsa, niqob "fon" kanalini qaytargan — teskarisini olamiz */
function orientPersonMask(mask: Float32Array, w: number, cx: number, cy: number, r: number): Float32Array {
  let sum = 0;
  let n = 0;
  for (let y = Math.max(0, Math.round(cy - r)); y <= Math.round(cy + r); y++) {
    for (let x = Math.max(0, Math.round(cx - r)); x <= Math.min(w - 1, Math.round(cx + r)); x++) {
      const v = mask[y * w + x];
      if (v !== undefined) {
        sum += v;
        n++;
      }
    }
  }
  if (n === 0 || sum / n >= 0.5) return mask;
  return mask.map((v) => 1 - v);
}

export async function analyzePhoto(file: Blob): Promise<PhotoFacts> {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const bitmap = await createImageBitmap(file); // EXIF yo'nalishi hisobga olinadi
  const W = bitmap.width;
  const H = bitmap.height;
  const scale = Math.min(1, MAX_ANALYSIS_SIDE / Math.max(W, H));
  const w = Math.max(1, Math.round(W * scale));
  const h = Math.max(1, Math.round(H * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas 2d mavjud emas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const pixels = ctx.getImageData(0, 0, w, h).data;

  const { face, segmenter } = await loadEngine();
  const faces = face.detect(canvas).faceLandmarks;
  const geometry = faces.length === 1 && faces[0] ? faceGeometry(faces[0], w, h) : null;

  let personMask: Float32Array | null = null;
  const seg = segmenter.segment(canvas);
  try {
    const mask = seg.confidenceMasks?.[0];
    if (mask) {
      const raw = mask.getAsFloat32Array();
      personMask = mask.width === w && mask.height === h ? Float32Array.from(raw) : resizeMask(raw, mask.width, mask.height, w, h);
    }
  } finally {
    seg.close();
  }
  if (personMask && geometry) {
    const cy = (geometry.eyeY + geometry.chinY) / 2;
    personMask = orientPersonMask(personMask, w, geometry.centerX, cy, geometry.faceWidth * 0.15);
  }

  const headTop =
    geometry && personMask ? headTopFromMask(personMask, w, h, geometry.centerX, geometry.faceWidth) : null;
  const k = H / h; // tahlil koordinatalaridan asl piksellarga

  return {
    isJpegSignature: hasJpegSignature(head),
    sizeBytes: file.size,
    width: W,
    height: H,
    faceCount: faces.length,
    headTopY: headTop ? headTop.y * k : null,
    headTouchesTop: headTop?.touchesTop ?? false,
    chinY: geometry ? geometry.chinY * k : null,
    eyeY: geometry ? geometry.eyeY * k : null,
    faceCenterX: geometry ? geometry.centerX * k : null,
    background: personMask ? backgroundStats(pixels, personMask, w, h) : null,
  };
}
