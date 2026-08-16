import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/price";
import type { Course } from "@/lib/types";

function course(overrides: Partial<Course> = {}): Course {
  return {
    courseName: "How To YouTube",
    courseCode: "how-to-youtube",
    description: "From concept to creation.",
    mainCategory: "Content Creation",
    shortCourse: "YouTube",
    courseType: "Original",
    pricePaise: 199900,
    priceUsdCents: 3999,
    mangoId: "a1b2c3d4e5f6789012345678",
    refundable: true,
    ...overrides,
  };
}

describe("formatPrice — India", () => {
  it("converts paise to rupees rather than printing the raw paise value", () => {
    // The whole point: 199900 paise is ₹1,999. If this ever renders
    // ₹1,99,900 the price is wrong by a factor of 100.
    const formatted = formatPrice(course(), "IN");
    expect(formatted).toBe("₹1,999");
    expect(formatted).not.toBe("₹1,99,900");
  });

  it("drops the decimals when the price is a whole number of rupees", () => {
    expect(formatPrice(course({ pricePaise: 79900 }), "IN")).toBe("₹799");
    expect(formatPrice(course({ pricePaise: 149900 }), "IN")).toBe("₹1,499");
  });

  it("keeps two decimals when paise do not divide evenly into rupees", () => {
    expect(formatPrice(course({ pricePaise: 199950 }), "IN")).toBe("₹1,999.50");
  });

  it("handles a free course", () => {
    expect(formatPrice(course({ pricePaise: 0 }), "IN")).toBe("Free");
  });
});

describe("formatPrice — United States", () => {
  it("converts cents to dollars and always shows two decimals", () => {
    expect(formatPrice(course(), "US")).toBe("$39.99");
    expect(formatPrice(course({ priceUsdCents: 1499 }), "US")).toBe("$14.99");
  });

  it("keeps the trailing zeros on a whole-dollar price", () => {
    expect(formatPrice(course({ priceUsdCents: 2000 }), "US")).toBe("$20.00");
  });

  it("handles a free course", () => {
    expect(formatPrice(course({ priceUsdCents: 0 }), "US")).toBe("Free");
  });
});

describe("formatPrice — the two currencies never mix", () => {
  it("reads only the field that belongs to the country", () => {
    // A course whose two price fields disagree wildly proves which field was read.
    const odd = course({ pricePaise: 500000, priceUsdCents: 100 });
    expect(formatPrice(odd, "IN")).toBe("₹5,000");
    expect(formatPrice(odd, "US")).toBe("$1.00");
  });
});
