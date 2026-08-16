/** The two markets the pricing endpoint alternates between. */
export type CountryCode = "IN" | "US";

/**
 * A course as the API sends it. Note the price units: `pricePaise` is
 * hundredths of a rupee and `priceUsdCents` is hundredths of a dollar, so
 * both need dividing by 100 before they are shown to anyone.
 */
export interface Course {
  courseName: string;
  courseCode: string;
  description: string;
  mainCategory: string;
  shortCourse: string;
  courseType: string;
  pricePaise: number;
  priceUsdCents: number;
  mangoId: string;
  refundable: boolean;
}
