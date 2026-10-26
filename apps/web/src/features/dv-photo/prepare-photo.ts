// Brauzerda: fotoni tahlil qilish → kerak bo'lsa avto-kesish (600×600 JPEG ≤ 240 KB) → qayta tekshirish.
import {
  CROP_TARGET,
  DV_PHOTO_RULES,
  evaluatePhoto,
  planCrop,
  type CropFailure,
  type CropPlan,
  type PhotoFacts,
} from "@vakil/dv-photo";
import { analyzePhoto } from "./analyze-photo";

const MAX_BYTES = 240_000;

export interface PreparedPhoto {
  blob: Blob;
  facts: PhotoFacts;
  /** original — asl fayl talabga mos; cropped — avto-tayyorlandi; unprocessed — kesib bo'lmadi */
  mode: "original" | "cropped" | "unprocessed";
  cropFailure?: CropFailure;
  lowResolution?: boolean;
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", quality),
  );
}

/** Kesish va o'lcham — yuz tahrirlanmaydi. Sifat hajm chegarasiga sig'guncha pasaytiriladi. */
export async function renderCrop(file: Blob, crop: CropPlan, size = CROP_TARGET.outputSize): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d mavjud emas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, crop.x, crop.y, crop.size, crop.size, 0, 0, size, size);
  bitmap.close();

  let quality = 0.92;
  let blob = await canvasToJpeg(canvas, quality);
  while (blob.size > MAX_BYTES && quality > 0.5) {
    quality -= 0.06;
    blob = await canvasToJpeg(canvas, quality);
  }
  return blob;
}

const fitsAsIs = (f: PhotoFacts) =>
  f.isJpegSignature && f.width === 600 && f.height === 600 && f.sizeBytes <= MAX_BYTES;

export async function preparePhoto(file: Blob): Promise<PreparedPhoto> {
  const facts = await analyzePhoto(file);
  const report = evaluatePhoto(facts, DV_PHOTO_RULES);

  // Asl fayl allaqachon talabga mos — baytlarini o'zgartirmaymiz
  if (fitsAsIs(facts) && report.verdict !== "fail") return { blob: file, facts, mode: "original" };

  const plan = planCrop(facts);
  if (!plan.ok) return { blob: file, facts, mode: "unprocessed", cropFailure: plan.reason };

  const cropped = await renderCrop(file, plan.crop);
  const croppedFacts = await analyzePhoto(cropped);
  return { blob: cropped, facts: croppedFacts, mode: "cropped", lowResolution: plan.lowResolution };
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("FileReader"));
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body = ""] = dataUrl.split(",", 2);
  const mime = /data:([^;]+)/.exec(head ?? "")?.[1] ?? "application/octet-stream";
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Fayl yuklab olish (brauzerning o'zida — serverga hech narsa ketmaydi) */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
