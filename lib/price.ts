import type { CountryCode, Course } from "@/lib/types";

/**
 * The prices arrive in the smallest unit of each currency: 199900 paise is
 * ₹1,999 and 3999 cents is $39.99. Everything below exists to make sure that
 * division by 100 happens exactly once.
 */
const SUBUNITS_PER_UNIT = 100;

interface CurrencyRules {
  locale: string;
  currency: string;
  /** Reads the correct field for this market off the course. */
  subunits: (course: Course) => number;
  /** US prices always carry cents; rupee prices only when they are not round. */
  fractionDigits: (subunits: number) => number;
}

const RULES: Record<CountryCode, CurrencyRules> = {
  IN: {
    locale: "en-IN",
    currency: "INR",
    subunits: (course) => course.pricePaise,
    fractionDigits: (subunits) => (subunits % SUBUNITS_PER_UNIT === 0 ? 0 : 2),
  },
  US: {
    locale: "en-US",
    currency: "USD",
    subunits: (course) => course.priceUsdCents,
    fractionDigits: () => 2,
  },
};

/** Building a formatter is not free, and the grid asks for one per card. */
const formatters = new Map<string, Intl.NumberFormat>();

function formatter(rules: CurrencyRules, fractionDigits: number) {
  const key = `${rules.locale}:${rules.currency}:${fractionDigits}`;
  let cached = formatters.get(key);
  if (!cached) {
    cached = new Intl.NumberFormat(rules.locale, {
      style: "currency",
      currency: rules.currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    formatters.set(key, cached);
  }
  return cached;
}

/**
 * Formats a course's price for one market. The country is decided once for
 * the whole page, so every card on screen speaks the same currency.
 */
export function formatPrice(course: Course, country: CountryCode): string {
  const rules = RULES[country];
  const subunits = rules.subunits(course);

  if (!Number.isFinite(subunits)) return "";
  if (subunits === 0) return "Free";

  const digits = rules.fractionDigits(subunits);
  return formatter(rules, digits).format(subunits / SUBUNITS_PER_UNIT);
}

