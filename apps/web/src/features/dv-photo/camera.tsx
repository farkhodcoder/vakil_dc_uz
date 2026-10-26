"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CameraIcon, CrossIcon, SwitchCameraIcon } from "@/components/icons";
import type { Dictionary, LiveHint } from "@/i18n/dictionaries/types";
import { loadVideoLandmarker } from "./analyze-photo";
import { liveHint } from "./live-hint";

type CameraState = "starting" | "live" | "denied" | "unsupported" | "insecure";
type T = Dictionary["camera"];

const DETECT_EVERY_MS = 200;

/**
 * To'liq ekranli kamera: DV kvadrat ramkasi, ko'z oralig'i (pastdan 56–69 %), bosh shabloni
 * va jonli ko'rsatma. Surat to'liq kadr sifatida olinadi — aniq kesish tahlildan keyin.
 * Video hech qayerga yuborilmaydi.
 */
export function CameraCapture({
  t,
  onCapture,
  onClose,
}: {
  t: T;
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureRef = useRef<HTMLButtonElement>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  // Komponent faqat brauzerda (tugma bosilganda) ochiladi — window mavjud
  const [state, setState] = useState<CameraState>(() =>
    !window.isSecureContext ? "insecure" : !navigator.mediaDevices?.getUserMedia ? "unsupported" : "starting",
  );
  const supported = state !== "insecure" && state !== "unsupported";
  const [hint, setHint] = useState<LiveHint>("loading");
  const [busy, setBusy] = useState(false);

  // Kamera oqimi
  useEffect(() => {
    if (!supported) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((tr) => tr.stop());
          return;
        }
        stream = s;
        const video = videoRef.current;
        if (video) {
          video.srcObject = s;
          void video.play().catch(() => undefined);
        }
        setState("live");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : "";
        setState(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unsupported");
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [facing, supported]);

  // Jonli ko'rsatma (taxminan 5 marta/soniya)
  useEffect(() => {
    if (state !== "live") return;
    let raf = 0;
    let last = 0;
    let stopped = false;
    let landmarker: Awaited<ReturnType<typeof loadVideoLandmarker>> | null = null;
    loadVideoLandmarker()
      .then((lm) => {
        landmarker = lm;
      })
      .catch(() => undefined);

    const tick = (now: number) => {
      if (stopped) return;
      const video = videoRef.current;
      if (landmarker && video && video.readyState >= 2 && now - last >= DETECT_EVERY_MS) {
        last = now;
        try {
          const res = landmarker.detectForVideo(video, now);
          setHint(liveHint(res.faceLandmarks, video.videoWidth, video.videoHeight));
        } catch {
          // bitta kadr xatosi — keyingisida qayta urinamiz
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [state]);

  // Orqa fon aylanmasin; Escape — yopish
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    captureRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const capture = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    setBusy(true);
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setBusy(false);
      return;
    }
    // Asl (ko'zgusiz) kadr: ekrandagi ko'zgu faqat qulaylik uchun
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        setBusy(false);
        if (blob) onCapture(blob);
      },
      "image/jpeg",
      0.95,
    );
  }, [onCapture]);

  const mirrored = facing === "user";
  const ok = hint === "ok";
  const error =
    state === "denied" ? t.denied : state === "unsupported" ? t.unsupported : state === "insecure" ? t.insecure : null;

  return (
    <div role="dialog" aria-modal="true" aria-label={t.capture} className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/10 px-4 font-semibold hover:bg-white/20"
        >
          <CrossIcon className="size-5" />
          {t.close}
        </button>
        {state === "live" && (
          <button
            type="button"
            onClick={() => {
              setState("starting");
              setFacing((f) => (f === "user" ? "environment" : "user"));
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/10 px-4 font-semibold hover:bg-white/20"
          >
            <SwitchCameraIcon className="size-5" />
            <span className="hidden sm:inline">{t.switch}</span>
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-6">
        {error ? (
          <p role="alert" className="max-w-sm rounded-2xl bg-white/10 px-5 py-4 text-center font-semibold">
            {error}
          </p>
        ) : (
          <>
            {/* Ko'rinadigan maydon — videoning markaziy kvadrati (DV fotosi kvadrat) */}
            <div className="relative aspect-square w-full max-w-[min(92vw,62vh)] overflow-hidden rounded-3xl bg-neutral-900">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="absolute inset-0 size-full object-cover"
                style={mirrored ? { transform: "scaleX(-1)" } : undefined}
              />
              <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
                <defs>
                  <mask id="head-cutout">
                    <rect width="100" height="100" fill="white" />
                    <ellipse cx="50" cy="39.5" rx="22" ry="29.5" fill="black" />
                  </mask>
                </defs>
                {/* Bosh shabloni atrofi xiralashtiriladi */}
                <rect width="100" height="100" fill="black" opacity="0.35" mask="url(#head-cutout)" />
                {/* Ko'z oralig'i: pastdan 56–69 % → yuqoridan 31–44 % */}
                <rect x="0" y="31" width="100" height="13" fill={ok ? "#23B26D" : "#ffffff"} opacity="0.16" />
                <line x1="0" y1="31" x2="100" y2="31" stroke={ok ? "#23B26D" : "#ffffff"} strokeWidth="0.5" strokeDasharray="2 1.5" />
                <line x1="0" y1="44" x2="100" y2="44" stroke={ok ? "#23B26D" : "#ffffff"} strokeWidth="0.5" strokeDasharray="2 1.5" />
                <ellipse
                  cx="50"
                  cy="39.5"
                  rx="22"
                  ry="29.5"
                  fill="none"
                  stroke={ok ? "#23B26D" : "#ffffff"}
                  strokeWidth="0.8"
                />
              </svg>
              <span className="absolute left-2 top-[31%] -translate-y-full rounded bg-black/50 px-1.5 py-0.5 text-[11px] font-semibold">
                {t.guideEyes}
              </span>
              {state === "starting" && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="size-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                </span>
              )}
            </div>

            <p
              aria-live="polite"
              className={`min-h-11 rounded-full px-5 py-2.5 text-center font-bold ${ok ? "bg-ok text-white" : "bg-white/12 text-white"}`}
            >
              {t.hints[state === "live" ? hint : "loading"]}
            </p>

            <button
              ref={captureRef}
              type="button"
              disabled={state !== "live" || busy}
              onClick={() => void capture()}
              aria-label={t.capture}
              className={`flex size-20 items-center justify-center rounded-full border-4 transition-colors disabled:opacity-40 ${
                ok ? "border-ok bg-ok/20" : "border-white bg-white/10"
              }`}
            >
              <CameraIcon className="size-8" />
            </button>

            <ul className="max-w-md list-disc space-y-1 pl-5 text-sm text-white/75">
              {t.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
