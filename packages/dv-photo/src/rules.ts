import type {
  I18n,
  Locale,
  PhotoFacts,
  PhotoReport,
  RuleCheck,
  RuleConfig,
  SelfCheckItem,
  Verdict,
} from "./types";

/**
 * DV foto talablari.
 * Manba: DV-2026 Federal Register xabarnomasi (89 FR 79997, 2024-10-01): JPEG, 600×600 piksel,
 * ≤ 240 kB, rangli, bosh balandligi kadrning 50–69 %, oxirgi 6 oy ichida olingan.
 * Ko'z chizig'i (pastdan 56–69 %) — Davlat departamentining foto kompozitsiya shabloni.
 * [TEKSHIRILSIN] DV-2027 rasmiy yo'riqnomasi e'lon qilingach qayta solishtirilsin.
 */
export const DV_PHOTO_RULES: readonly RuleConfig[] = [
  { engine: "rule", code: "photo.format_jpeg" },
  { engine: "rule", code: "photo.dimensions", params: { width: 600, height: 600 } },
  { engine: "rule", code: "photo.max_size", params: { max_bytes: 240_000 } },
  { engine: "rule", code: "photo.head_height_pct", params: { min: 50, max: 69 } },
  { engine: "rule", code: "photo.eye_line_pct_from_bottom", params: { min: 56, max: 69 } },
  { engine: "rule", code: "photo.background_white" },
  { engine: "ai", code: "photo.no_glasses" },
  { engine: "ai", code: "photo.quality" },
  { engine: "human", code: "photo.taken_within_6_months" },
];

/**
 * Fon uchun EVRISTIK chegaralar. Rasmiy talab faqat "oq / oqish fon" deydi —
 * raqamli chegara bermaydi. Qiymatlar real fotolarda kalibrlanadi; shuning uchun
 * noaniq oraliq "fail" emas, "warn" beradi.
 */
export const BACKGROUND_HEURISTIC = {
  passMinLuma: 200,
  passMaxChroma: 25,
  passMaxStd: 30,
  warnMinLuma: 170,
  warnMaxChroma: 40,
  minSampleRatio: 0.05,
} as const;

const GEOMETRY_CODES = new Set(["photo.head_height_pct", "photo.eye_line_pct_from_bottom"]);

const SELF_CHECK_LABELS: Record<string, I18n> = {
  "photo.no_glasses": {
    uz_latn: "Ko‘zoynak taqilmagan",
    uz_cyrl: "Кўзойнак тақилмаган",
    ru: "Без очков",
    en: "No eyeglasses",
    tr: "Gözlük takılmamış",
  },
  "photo.quality": {
    uz_latn: "Rasm tiniq: xira emas, yaltiramaydi, yuzda soya yo‘q",
    uz_cyrl: "Расм тиниқ: хира эмас, ялтирамайди, юзда соя йўқ",
    ru: "Фото чёткое: не размыто, без бликов и теней на лице",
    en: "The photo is sharp: not blurry, no glare, no shadows on the face",
    tr: "Fotoğraf net: bulanık değil, parlama yok, yüzde gölge yok",
  },
  "photo.taken_within_6_months": {
    uz_latn: "Foto oxirgi 6 oy ichida olingan",
    uz_cyrl: "Фото охирги 6 ой ичида олинган",
    ru: "Фото сделано в последние 6 месяцев",
    en: "The photo was taken within the last 6 months",
    tr: "Fotoğraf son 6 ay içinde çekildi",
  },
};

const LOCALES: readonly Locale[] = ["uz_latn", "uz_cyrl", "ru", "en", "tr"];

// O'nlik ajratuvchi: ingliz tilida nuqta (59.9%), qolganlarida vergul (59,9%)
function formatValue(v: string | number, locale: Locale): string {
  if (typeof v !== "number") return v;
  return locale === "en" ? String(v) : String(v).replace(".", ",");
}

function fill(text: I18n, vars: Record<string, string | number>): I18n {
  const out = {} as I18n;
  for (const locale of LOCALES) {
    out[locale] = text[locale].replace(/\{(\w+)\}/g, (_, k: string) =>
      k in vars ? formatValue(vars[k]!, locale) : `{${k}}`,
    );
  }
  return out;
}

function num(params: RuleConfig["params"], key: string): number | null {
  const v = params?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

const round1 = (v: number) => Math.round(v * 10) / 10;

const MISSING_PARAMS: I18n = {
  uz_latn: "Mezon sozlamalari to‘liq emas — tekshirilmadi",
  uz_cyrl: "Мезон созламалари тўлиқ эмас — текширилмади",
  ru: "Параметры критерия не заданы — не проверено",
  en: "Rule parameters are incomplete — not checked",
  tr: "Kural parametreleri eksik — kontrol edilmedi",
};

// ───────────────────────────── Alohida qoidalar ─────────────────────────────

function checkFormat(f: PhotoFacts): RuleCheck {
  return f.isJpegSignature
    ? {
        code: "photo.format_jpeg",
        outcome: "pass",
        message: { uz_latn: "Format: JPEG", uz_cyrl: "Формат: JPEG", ru: "Формат: JPEG", en: "Format: JPEG", tr: "Biçim: JPEG" },
      }
    : {
        code: "photo.format_jpeg",
        outcome: "fail",
        message: {
          uz_latn: "Fayl JPEG formatida emas",
          uz_cyrl: "Файл JPEG форматида эмас",
          ru: "Файл не в формате JPEG",
          en: "The file is not a JPEG",
          tr: "Dosya JPEG biçiminde değil",
        },
        fixHint: {
          uz_latn: "«Avto-tayyorlash» tugmasini bosing — rasm JPEG'ga o‘tkaziladi.",
          uz_cyrl: "«Авто-тайёрлаш» тугмасини босинг — расм JPEG'га ўтказилади.",
          ru: "Нажмите «Автоподготовка» — фото будет сохранено в JPEG.",
          en: "Press “Auto-prepare” — the photo will be saved as JPEG.",
          tr: "“Otomatik hazırla” düğmesine basın — fotoğraf JPEG olarak kaydedilir.",
        },
      };
}

function checkDimensions(f: PhotoFacts, rule: RuleConfig): RuleCheck {
  const W = num(rule.params, "width");
  const H = num(rule.params, "height");
  if (W === null || H === null) return { code: rule.code, outcome: "skip", message: MISSING_PARAMS };
  const measured = { width: f.width, height: f.height };
  if (f.width === W && f.height === H) {
    return {
      code: rule.code,
      outcome: "pass",
      measured,
      message: fill(
        {
          uz_latn: "O‘lcham: {w}×{h} piksel",
          uz_cyrl: "Ўлчам: {w}×{h} пиксел",
          ru: "Размер: {w}×{h} пикселей",
          en: "Size: {w}×{h} pixels",
          tr: "Boyut: {w}×{h} piksel",
        },
        { w: f.width, h: f.height },
      ),
    };
  }
  return {
    code: rule.code,
    outcome: "fail",
    measured,
    message: fill(
      {
        uz_latn: "O‘lcham {w}×{h} piksel, kerak: {W}×{H}",
        uz_cyrl: "Ўлчам {w}×{h} пиксел, керак: {W}×{H}",
        ru: "Размер {w}×{h} пикселей, нужно: {W}×{H}",
        en: "Size is {w}×{h} pixels, required: {W}×{H}",
        tr: "Boyut {w}×{h} piksel, gereken: {W}×{H}",
      },
      { w: f.width, h: f.height, W, H },
    ),
    fixHint: fill(
      {
        uz_latn: "«Avto-tayyorlash» rasmni {W}×{H} kvadratga keltiradi. Yuzni tahrirlamang — faqat kesish va o‘lcham.",
        uz_cyrl: "«Авто-тайёрлаш» расмни {W}×{H} квадратга келтиради. Юзни таҳрирламанг — фақат кесиш ва ўлчам.",
        ru: "«Автоподготовка» приведёт фото к квадрату {W}×{H}. Не редактируйте лицо — только обрезка и размер.",
        en: "“Auto-prepare” crops the photo to a {W}×{H} square. Do not edit the face — only crop and resize.",
        tr: "“Otomatik hazırla” fotoğrafı {W}×{H} kareye getirir. Yüzü düzenlemeyin — yalnızca kırpma ve boyut.",
      },
      { W, H },
    ),
  };
}

function checkMaxSize(f: PhotoFacts, rule: RuleConfig): RuleCheck {
  const max = num(rule.params, "max_bytes");
  if (max === null) return { code: rule.code, outcome: "skip", message: MISSING_PARAMS };
  const vars = { kb: round1(f.sizeBytes / 1000), max: round1(max / 1000) };
  const measured = { size_bytes: f.sizeBytes };
  if (f.sizeBytes <= max) {
    return {
      code: rule.code,
      outcome: "pass",
      measured,
      message: fill(
        {
          uz_latn: "Hajm: {kb} KB (≤ {max} KB)",
          uz_cyrl: "Ҳажм: {kb} KB (≤ {max} KB)",
          ru: "Объём: {kb} КБ (≤ {max} КБ)",
          en: "File size: {kb} KB (≤ {max} KB)",
          tr: "Dosya boyutu: {kb} KB (≤ {max} KB)",
        },
        vars,
      ),
    };
  }
  return {
    code: rule.code,
    outcome: "fail",
    measured,
    message: fill(
      {
        uz_latn: "Hajm {kb} KB — chegaradan katta ({max} KB)",
        uz_cyrl: "Ҳажм {kb} KB — чегарадан катта ({max} KB)",
        ru: "Объём {kb} КБ — больше лимита ({max} КБ)",
        en: "File size {kb} KB exceeds the limit ({max} KB)",
        tr: "Dosya boyutu {kb} KB — sınırı aşıyor ({max} KB)",
      },
      vars,
    ),
    fixHint: {
      uz_latn: "«Avto-tayyorlash» hajmni chegaraga moslab saqlaydi.",
      uz_cyrl: "«Авто-тайёрлаш» ҳажмни чегарага мослаб сақлайди.",
      ru: "«Автоподготовка» сохранит файл в пределах лимита.",
      en: "“Auto-prepare” saves the file within the limit.",
      tr: "“Otomatik hazırla” dosyayı sınır içinde kaydeder.",
    },
  };
}

function checkFace(f: PhotoFacts): RuleCheck {
  if (f.faceCount === 1) {
    return {
      code: "photo.face_detected",
      outcome: "pass",
      measured: { faces: 1 },
      message: {
        uz_latn: "Bitta yuz aniqlandi",
        uz_cyrl: "Битта юз аниқланди",
        ru: "Обнаружено одно лицо",
        en: "One face detected",
        tr: "Bir yüz algılandı",
      },
    };
  }
  if (f.faceCount === 0) {
    return {
      code: "photo.face_detected",
      outcome: "fail",
      measured: { faces: 0 },
      message: {
        uz_latn: "Rasmda yuz topilmadi",
        uz_cyrl: "Расмда юз топилмади",
        ru: "Лицо на фото не найдено",
        en: "No face found in the photo",
        tr: "Fotoğrafta yüz bulunamadı",
      },
      fixHint: {
        uz_latn: "Yuz to‘liq ko‘rinadigan, to‘g‘ridan-to‘g‘ri kameraga qaragan foto yuklang.",
        uz_cyrl: "Юз тўлиқ кўринадиган, тўғридан-тўғри камерага қараган фото юкланг.",
        ru: "Загрузите фото, где лицо видно полностью и смотрит прямо в камеру.",
        en: "Use a photo where the full face is visible and looking straight at the camera.",
        tr: "Yüzün tamamen göründüğü ve doğrudan kameraya bakılan bir fotoğraf kullanın.",
      },
    };
  }
  return {
    code: "photo.face_detected",
    outcome: "fail",
    measured: { faces: f.faceCount },
    message: fill(
      {
        uz_latn: "Rasmda {n} ta yuz bor — faqat bitta odam bo‘lishi kerak",
        uz_cyrl: "Расмда {n} та юз бор — фақат битта одам бўлиши керак",
        ru: "На фото лиц: {n} — должен быть только один человек",
        en: "{n} faces in the photo — only one person is allowed",
        tr: "Fotoğrafta {n} yüz var — yalnızca bir kişi olmalı",
      },
      { n: f.faceCount },
    ),
    fixHint: {
      uz_latn: "Faqat o‘zingiz tushgan foto yuklang.",
      uz_cyrl: "Фақат ўзингиз тушган фото юкланг.",
      ru: "Загрузите фото, где изображены только вы.",
      en: "Use a photo of only yourself.",
      tr: "Yalnızca sizin olduğunuz bir fotoğraf kullanın.",
    },
  };
}

function checkHeadHeight(f: PhotoFacts, rule: RuleConfig): RuleCheck {
  const min = num(rule.params, "min");
  const max = num(rule.params, "max");
  if (min === null || max === null) return { code: rule.code, outcome: "skip", message: MISSING_PARAMS };
  if (f.faceCount !== 1 || f.headTopY === null || f.chinY === null || f.height <= 0) {
    return {
      code: rule.code,
      outcome: "skip",
      message: {
        uz_latn: "Bosh balandligini o‘lchab bo‘lmadi",
        uz_cyrl: "Бош баландлигини ўлчаб бўлмади",
        ru: "Не удалось измерить высоту головы",
        en: "Could not measure the head height",
        tr: "Baş yüksekliği ölçülemedi",
      },
    };
  }
  // Ko'rsatiladigan qiymat (0.1%) bilan taqqoslanadi — hukm va ekrandagi raqam bir xil bo'ladi
  const pct = round1(((f.chinY - f.headTopY) / f.height) * 100);
  const vars = { v: pct, min, max };
  const measured = { head_pct: pct, head_touches_top: f.headTouchesTop };

  if (pct >= min && pct <= max) {
    const base: RuleCheck = {
      code: rule.code,
      outcome: "pass",
      measured,
      message: fill(
        {
          uz_latn: "Bosh balandligi: {v}% ({min}–{max}%)",
          uz_cyrl: "Бош баландлиги: {v}% ({min}–{max}%)",
          ru: "Высота головы: {v}% ({min}–{max}%)",
          en: "Head height: {v}% ({min}–{max}%)",
          tr: "Baş yüksekliği: %{v} (%{min}–%{max})",
        },
        vars,
      ),
    };
    if (!f.headTouchesTop) return base;
    return {
      ...base,
      outcome: "warn",
      fixHint: {
        uz_latn: "Boshingiz kadrning yuqori chetiga tegib turibdi — soch kesilmagan bo‘lishi kerak.",
        uz_cyrl: "Бошингиз кадрнинг юқори четига тегиб турибди — соч кесилмаган бўлиши керак.",
        ru: "Голова касается верхнего края кадра — волосы не должны быть обрезаны.",
        en: "Your head touches the top edge — the hair must not be cut off.",
        tr: "Başınız karenin üst kenarına değiyor — saç kesilmemiş olmalı.",
      },
    };
  }
  if (pct > max) {
    return {
      code: rule.code,
      outcome: "fail",
      measured,
      message: fill(
        {
          uz_latn: "Bosh juda katta: {v}% (kerak {min}–{max}%)",
          uz_cyrl: "Бош жуда катта: {v}% (керак {min}–{max}%)",
          ru: "Голова слишком большая: {v}% (нужно {min}–{max}%)",
          en: "Head is too large: {v}% (required {min}–{max}%)",
          tr: "Baş çok büyük: %{v} (gereken %{min}–%{max})",
        },
        vars,
      ),
      fixHint: {
        uz_latn: "«Avto-tayyorlash»ni bosing yoki kameradan biroz uzoqroq turib qayta suratga tushing.",
        uz_cyrl: "«Авто-тайёрлаш»ни босинг ёки камерадан бироз узоқроқ туриб қайта суратга тушинг.",
        ru: "Нажмите «Автоподготовка» или сфотографируйтесь чуть дальше от камеры.",
        en: "Press “Auto-prepare” or retake the photo standing a little farther from the camera.",
        tr: "“Otomatik hazırla”ya basın veya kameradan biraz uzakta durarak yeniden çekin.",
      },
    };
  }
  return {
    code: rule.code,
    outcome: "fail",
    measured,
    message: fill(
      {
        uz_latn: "Bosh juda kichik: {v}% (kerak {min}–{max}%)",
        uz_cyrl: "Бош жуда кичик: {v}% (керак {min}–{max}%)",
        ru: "Голова слишком маленькая: {v}% (нужно {min}–{max}%)",
        en: "Head is too small: {v}% (required {min}–{max}%)",
        tr: "Baş çok küçük: %{v} (gereken %{min}–%{max})",
      },
      vars,
    ),
    fixHint: {
      uz_latn: "«Avto-tayyorlash»ni bosing yoki kameraga yaqinroq turing.",
      uz_cyrl: "«Авто-тайёрлаш»ни босинг ёки камерага яқинроқ туринг.",
      ru: "Нажмите «Автоподготовка» или встаньте ближе к камере.",
      en: "Press “Auto-prepare” or stand closer to the camera.",
      tr: "“Otomatik hazırla”ya basın veya kameraya daha yakın durun.",
    },
  };
}

function checkEyeLine(f: PhotoFacts, rule: RuleConfig): RuleCheck {
  const min = num(rule.params, "min");
  const max = num(rule.params, "max");
  if (min === null || max === null) return { code: rule.code, outcome: "skip", message: MISSING_PARAMS };
  if (f.faceCount !== 1 || f.eyeY === null || f.height <= 0) {
    return {
      code: rule.code,
      outcome: "skip",
      message: {
        uz_latn: "Ko‘z chizig‘ini o‘lchab bo‘lmadi",
        uz_cyrl: "Кўз чизиғини ўлчаб бўлмади",
        ru: "Не удалось измерить линию глаз",
        en: "Could not measure the eye line",
        tr: "Göz hizası ölçülemedi",
      },
    };
  }
  const pct = round1(((f.height - f.eyeY) / f.height) * 100);
  const vars = { v: pct, min, max };
  const measured = { eye_pct_from_bottom: pct };

  if (pct >= min && pct <= max) {
    return {
      code: rule.code,
      outcome: "pass",
      measured,
      message: fill(
        {
          uz_latn: "Ko‘z chizig‘i pastdan: {v}% ({min}–{max}%)",
          uz_cyrl: "Кўз чизиғи пастдан: {v}% ({min}–{max}%)",
          ru: "Линия глаз от низа: {v}% ({min}–{max}%)",
          en: "Eye line from the bottom: {v}% ({min}–{max}%)",
          tr: "Göz hizası alttan: %{v} (%{min}–%{max})",
        },
        vars,
      ),
    };
  }
  if (pct > max) {
    return {
      code: rule.code,
      outcome: "fail",
      measured,
      message: fill(
        {
          uz_latn: "Ko‘zlar juda yuqorida: {v}% (kerak {min}–{max}%)",
          uz_cyrl: "Кўзлар жуда юқорида: {v}% (керак {min}–{max}%)",
          ru: "Глаза слишком высоко: {v}% (нужно {min}–{max}%)",
          en: "Eyes are too high: {v}% (required {min}–{max}%)",
          tr: "Gözler çok yukarıda: %{v} (gereken %{min}–%{max})",
        },
        vars,
      ),
      fixHint: {
        uz_latn: "«Avto-tayyorlash» kadrni qayta kesadi: bosh tepasida ko‘proq joy qoladi.",
        uz_cyrl: "«Авто-тайёрлаш» кадрни қайта кесади: бош тепасида кўпроқ жой қолади.",
        ru: "«Автоподготовка» перекадрирует фото: над головой будет больше места.",
        en: "“Auto-prepare” re-crops the photo to leave more space above the head.",
        tr: "“Otomatik hazırla” kareyi yeniden kırpar: başın üstünde daha fazla boşluk kalır.",
      },
    };
  }
  return {
    code: rule.code,
    outcome: "fail",
    measured,
    message: fill(
      {
        uz_latn: "Ko‘zlar juda pastda: {v}% (kerak {min}–{max}%)",
        uz_cyrl: "Кўзлар жуда пастда: {v}% (керак {min}–{max}%)",
        ru: "Глаза слишком низко: {v}% (нужно {min}–{max}%)",
        en: "Eyes are too low: {v}% (required {min}–{max}%)",
        tr: "Gözler çok aşağıda: %{v} (gereken %{min}–%{max})",
      },
      vars,
    ),
    fixHint: {
      uz_latn: "«Avto-tayyorlash» kadrni qayta kesadi: bosh tepasidagi bo‘sh joy kamayadi.",
      uz_cyrl: "«Авто-тайёрлаш» кадрни қайта кесади: бош тепасидаги бўш жой камаяди.",
      ru: "«Автоподготовка» перекадрирует фото: места над головой станет меньше.",
      en: "“Auto-prepare” re-crops the photo to reduce the space above the head.",
      tr: "“Otomatik hazırla” kareyi yeniden kırpar: başın üstündeki boşluk azalır.",
    },
  };
}

const BACKGROUND_HINT: I18n = {
  uz_latn: "Oq yoki oqish devor oldida, soyasiz suratga tushing.",
  uz_cyrl: "Оқ ёки оқиш девор олдида, соясиз суратга тушинг.",
  ru: "Сфотографируйтесь на фоне белой или почти белой стены, без теней.",
  en: "Take the photo in front of a white or off-white wall, without shadows.",
  tr: "Beyaz veya kırık beyaz bir duvarın önünde, gölgesiz çekin.",
};

function checkBackground(f: PhotoFacts, rule: RuleConfig): RuleCheck {
  const h = BACKGROUND_HEURISTIC;
  const bg = f.background;
  if (!bg || bg.sampleRatio < h.minSampleRatio) {
    return {
      code: rule.code,
      outcome: "skip",
      message: {
        uz_latn: "Fonni baholab bo‘lmadi (fon juda kam ko‘rinadi)",
        uz_cyrl: "Фонни баҳолаб бўлмади (фон жуда кам кўринади)",
        ru: "Не удалось оценить фон (фона почти не видно)",
        en: "Could not assess the background (too little of it is visible)",
        tr: "Arka plan değerlendirilemedi (çok az görünüyor)",
      },
    };
  }
  const measured = {
    luma: Math.round(bg.meanLuma),
    chroma: Math.round(bg.meanChroma),
    std: Math.round(bg.stdLuma),
  };
  if (bg.meanLuma >= h.passMinLuma && bg.meanChroma <= h.passMaxChroma && bg.stdLuma <= h.passMaxStd) {
    return {
      code: rule.code,
      outcome: "pass",
      measured,
      message: {
        uz_latn: "Fon: oq va bir xil",
        uz_cyrl: "Фон: оқ ва бир хил",
        ru: "Фон: белый и однородный",
        en: "Background: white and even",
        tr: "Arka plan: beyaz ve düzgün",
      },
    };
  }
  if (bg.meanLuma >= h.warnMinLuma && bg.meanChroma <= h.warnMaxChroma) {
    return {
      code: rule.code,
      outcome: "warn",
      measured,
      message: {
        uz_latn: "Fon oq emasga o‘xshaydi yoki soya bor",
        uz_cyrl: "Фон оқ эмасга ўхшайди ёки соя бор",
        ru: "Фон, возможно, не белый или есть тени",
        en: "The background may not be white, or there are shadows",
        tr: "Arka plan beyaz olmayabilir veya gölge var",
      },
      fixHint: BACKGROUND_HINT,
    };
  }
  return {
    code: rule.code,
    outcome: "fail",
    measured,
    message: {
      uz_latn: "Fon oq emas",
      uz_cyrl: "Фон оқ эмас",
      ru: "Фон не белый",
      en: "The background is not white",
      tr: "Arka plan beyaz değil",
    },
    fixHint: BACKGROUND_HINT,
  };
}

const RULE_HANDLERS: Record<string, (f: PhotoFacts, r: RuleConfig) => RuleCheck> = {
  "photo.format_jpeg": (f) => checkFormat(f),
  "photo.dimensions": checkDimensions,
  "photo.max_size": checkMaxSize,
  "photo.head_height_pct": checkHeadHeight,
  "photo.eye_line_pct_from_bottom": checkEyeLine,
  "photo.background_white": checkBackground,
};

const NOT_AUTOMATIC: I18n = {
  uz_latn: "Bu mezon avtomatik tekshirilmaydi",
  uz_cyrl: "Бу мезон автоматик текширилмайди",
  ru: "Этот критерий не проверяется автоматически",
  en: "This criterion is not checked automatically",
  tr: "Bu ölçüt otomatik olarak kontrol edilmez",
};

/**
 * Qoidalar bo'yicha hisobot.
 * - engine "rule"  → avtomatik tekshiriladi (noma'lum kod → "skip")
 * - engine "ai" | "human" → foydalanuvchi o'zi tasdiqlaydigan ro'yxatga tushadi
 * Standart (yashirin) qiymatlar yo'q: parametr bo'lmasa mezon "skip" bo'ladi.
 */
export function evaluatePhoto(facts: PhotoFacts, rules: readonly RuleConfig[] = DV_PHOTO_RULES): PhotoReport {
  const checks: RuleCheck[] = [];
  const selfChecks: SelfCheckItem[] = [];

  if (rules.some((r) => r.engine === "rule" && GEOMETRY_CODES.has(r.code))) {
    checks.push(checkFace(facts));
  }

  for (const rule of rules) {
    if (rule.engine !== "rule") {
      selfChecks.push({
        code: rule.code,
        label: SELF_CHECK_LABELS[rule.code] ?? {
          uz_latn: rule.code,
          uz_cyrl: rule.code,
          ru: rule.code,
          en: rule.code,
          tr: rule.code,
        },
      });
      continue;
    }
    const handler = RULE_HANDLERS[rule.code];
    checks.push(handler ? handler(facts, rule) : { code: rule.code, outcome: "skip", message: NOT_AUTOMATIC });
  }

  let verdict: Verdict = "pass";
  if (checks.some((c) => c.outcome === "fail")) verdict = "fail";
  else if (checks.some((c) => c.outcome === "warn" || c.outcome === "skip") || selfChecks.length > 0) {
    verdict = "review";
  }

  return { verdict, checks, selfChecks };
}
