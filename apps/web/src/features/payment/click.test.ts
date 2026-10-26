import { describe, expect, it } from "vitest";
import {
  buildClickPayUrl,
  formatClickAmount,
  getClickConfig,
} from "./click";

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

describe("getClickConfig", () => {
  it("ikkala ID raqam bo'lsa — sozlangan", () => {
    expect(getClickConfig({ serviceId: "36", merchantId: " 46 " })).toEqual({
      serviceId: "36",
      merchantId: "46",
    });
  });
  it("bo'sh yoki noto'g'ri → null", () => {
    expect(getClickConfig({})).toBeNull();
    expect(getClickConfig({ serviceId: "36" })).toBeNull();
    expect(getClickConfig({ serviceId: "abc", merchantId: "46" })).toBeNull();
  });
});
