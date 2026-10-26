import { describe, expect, it } from "vitest";
import {
  buildClickPayUrl,
  formatClickAmount,
  getClickConfig,
  isClickResponse,
  pickClickFields,
} from "./click";
import { clickSign, clickSignTime } from "./click-sign";

describe("formatClickAmount", () => {
  it("tiyin → N.NN", () => {
    expect(formatClickAmount(999900)).toBe("9999.00");
    expect(formatClickAmount(100005)).toBe("1000.05");
  });
  it("noto'g'ri summa rad etiladi", () => {
    expect(() => formatClickAmount(0)).toThrow();
    expect(() => formatClickAmount(10.5)).toThrow();
  });
});

describe("buildClickPayUrl", () => {
  it("hujjatdagi parametrlar bilan my.click.uz havolasi", () => {
    const url = new URL(
      buildClickPayUrl({
        serviceId: "36",
        merchantId: "46",
        amountTiyin: 999900,
        transactionParam: "6f1c1c4e-3a8b-4d43-9a43-0e3f2d5f9c11",
        returnUrl: "https://vakil.uz/uz/tolov/natija?id=6f1c1c4e-3a8b-4d43-9a43-0e3f2d5f9c11",
      }),
    );
    expect(url.origin + url.pathname).toBe("https://my.click.uz/services/pay/");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      service_id: "36",
      merchant_id: "46",
      amount: "9999.00",
      transaction_param: "6f1c1c4e-3a8b-4d43-9a43-0e3f2d5f9c11",
      return_url: "https://vakil.uz/uz/tolov/natija?id=6f1c1c4e-3a8b-4d43-9a43-0e3f2d5f9c11",
    });
  });
});

describe("pickClickFields", () => {
  it("faqat protokol maydonlari, faqat matn, uzunligi cheklangan", () => {
    const form = pickClickFields([
      ["click_trans_id", "1001"],
      ["amount", "9999.00"],
      ["evil", "x"],
      ["sign_string", "a".repeat(300)],
      ["action", new Blob(["0"])],
    ]);
    expect(form).toEqual({ click_trans_id: "1001", amount: "9999.00" });
  });
});

describe("getClickConfig", () => {
  it("ikkala ID raqam bo'lsa — sozlangan", () => {
    expect(getClickConfig({ CLICK_SERVICE_ID: "36", CLICK_MERCHANT_ID: " 46 " })).toEqual({
      serviceId: "36",
      merchantId: "46",
    });
  });
  it("bo'sh yoki noto'g'ri → null", () => {
    expect(getClickConfig({})).toBeNull();
    expect(getClickConfig({ CLICK_SERVICE_ID: "36" })).toBeNull();
    expect(getClickConfig({ CLICK_SERVICE_ID: "abc", CLICK_MERCHANT_ID: "46" })).toBeNull();
  });
});

describe("isClickResponse", () => {
  it("error va error_note bo'lishi shart", () => {
    expect(isClickResponse({ error: 0, error_note: "Success" })).toBe(true);
    expect(isClickResponse({ error: "0" })).toBe(false);
    expect(isClickResponse(null)).toBe(false);
  });
});

describe("clickSign — bazadagi md5 bilan bir xil", () => {
  // Qiymatlar Postgres'da hisoblangan: select md5('1001'||'777'||'test-secret'||...)
  const base = {
    clickTransId: "1001",
    serviceId: "777",
    merchantTransId: "6f1c1c4e-3a8b-4d43-9a43-0e3f2d5f9c11",
    amount: "9999.00",
  };
  it("Prepare", () => {
    expect(clickSign({ ...base, action: "0", signTime: "2026-10-26 12:00:00" }, "test-secret")).toBe(
      "c0b85769a2f8bb808d748467fb1e6bfd",
    );
  });
  it("Complete (merchant_prepare_id bilan)", () => {
    expect(
      clickSign({ ...base, action: "1", merchantPrepareId: "42", signTime: "2026-10-26 12:00:05" }, "test-secret"),
    ).toBe("5b44f4fdfe7b16d4ac832be6820ebe4c");
  });
  it("sign_time formati", () => {
    expect(clickSignTime(new Date(2026, 9, 6, 9, 5, 3))).toBe("2026-10-06 09:05:03");
  });
});
