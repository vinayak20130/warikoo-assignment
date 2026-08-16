/**
 * Everything the two Framer property controls touch lives here, so the
 * control definitions and the component's default props cannot drift apart.
 */

export const DENSITIES = ["comfortable", "compact"] as const;
export type Density = (typeof DENSITIES)[number];

export const DEFAULTS = {
  accent: "#1F4B3F",
  density: "comfortable" as Density,
};

/** Fixed palette. Only the accent is designer-controlled. */
export const PALETTE = {
  paper: "#F7F8F6",
  surface: "#FFFFFF",
  ink: "#16191A",
  muted: "#5F6764",
  hairline: "#E3E7E3",
};

interface DensityTokens {
  cardPadding: number;
  cardRadius: number;
  gridGap: number;
  titleSize: number;
}

export const DENSITY_TOKENS: Record<Density, DensityTokens> = {
  comfortable: { cardPadding: 28, cardRadius: 16, gridGap: 24, titleSize: 19 },
  compact: { cardPadding: 20, cardRadius: 12, gridGap: 16, titleSize: 17 },
};

interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Framer hands back hex or rgba() depending on how the colour was picked. */
function parseColor(input: string): Rgb | null {
  const value = String(input ?? "").trim();

  const hex = value.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3 || digits.length === 4) {
      digits = digits
        .split("")
        .map((char) => char + char)
        .join("");
    }
    if (digits.length < 6) return null;
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
    };
  }

  const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number);
    if (parts.length < 3 || parts.slice(0, 3).some((n) => !Number.isFinite(n))) return null;
    return { r: parts[0], g: parts[1], b: parts[2] };
  }

  return null;
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const srgb = value / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * A designer can pick any accent, including a pale yellow. Deriving the button
 * label colour from the accent's luminance keeps the CTA readable whatever
 * they choose. 0.2 is where white and ink text have equal contrast.
 */
export function readableTextOn(background: string): string {
  const rgb = parseColor(background);
  if (!rgb) return "#FFFFFF";
  return relativeLuminance(rgb) > 0.2 ? PALETTE.ink : "#FFFFFF";
}

/** Tints derived from the accent, used for badges and focus rings. */
export function withAlpha(color: string, alpha: number): string {
  const rgb = parseColor(color);
  if (!rgb) return color;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/**
 * A very light accent makes badge text unreadable on its own tint, so the
 * badge falls back to ink in that case.
 */
export function readableAccentText(accent: string): string {
  const rgb = parseColor(accent);
  if (!rgb) return accent;
  return relativeLuminance(rgb) > 0.45 ? PALETTE.ink : accent;
}

/** The CSS custom properties the whole stylesheet reads from. */
export function themeVars(accent: string, density: Density): Record<string, string> {
  const tokens = DENSITY_TOKENS[density] ?? DENSITY_TOKENS.comfortable;

  return {
    "--sp-accent": accent,
    "--sp-accent-contrast": readableTextOn(accent),
    "--sp-accent-text": readableAccentText(accent),
    "--sp-accent-tint": withAlpha(accent, 0.09),
    "--sp-accent-ring": withAlpha(accent, 0.35),
    "--sp-paper": PALETTE.paper,
    "--sp-surface": PALETTE.surface,
    "--sp-ink": PALETTE.ink,
    "--sp-muted": PALETTE.muted,
    "--sp-hairline": PALETTE.hairline,
    "--sp-card-padding": `${tokens.cardPadding}px`,
    "--sp-card-radius": `${tokens.cardRadius}px`,
    "--sp-grid-gap": `${tokens.gridGap}px`,
    "--sp-title-size": `${tokens.titleSize}px`,
  };
}
