/**
 * Everything the two Framer property controls touch lives here, so the
 * control definitions and the component's default props cannot drift apart.
 */

export const MIN_COLUMNS = 1;
export const MAX_COLUMNS = 4;

export const DEFAULTS = {
  cardColor: "#FFFFFF",
  columns: 3,
};

/**
 * Fixed palette. Only the card colour is designer-controlled; the accent is
 * part of the brand and stays put.
 */
export const PALETTE = {
  paper: "#F7F8F6",
  accent: "#1F4B3F",
  ink: "#16191A",
  muted: "#5F6764",
  hairline: "#E3E7E3",
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
 * A designer can pick any card colour, including near-black. Deriving the
 * text colour from the surface's luminance keeps the card readable whatever
 * they choose. 0.2 is where white and ink text have equal contrast.
 */
export function readableTextOn(background: string): string {
  const rgb = parseColor(background);
  if (!rgb) return "#FFFFFF";
  return relativeLuminance(rgb) > 0.2 ? PALETTE.ink : "#FFFFFF";
}

/** Tints derived from a colour, used for badges, rings and skeletons. */
export function withAlpha(color: string, alpha: number): string {
  const rgb = parseColor(color);
  if (!rgb) return color;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/** Cards per row is a count, so anything else has to be made into one. */
export function clampColumns(value: number): number {
  if (!Number.isFinite(value)) return DEFAULTS.columns;
  return Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, Math.round(value)));
}

/** The CSS custom properties the whole stylesheet reads from. */
export function themeVars(cardColor: string, columns: number): Record<string, string> {
  const cols = clampColumns(columns);
  const cardInk = readableTextOn(cardColor);
  const onDark = cardInk !== PALETTE.ink;

  return {
    "--sp-accent": PALETTE.accent,
    "--sp-accent-contrast": readableTextOn(PALETTE.accent),
    "--sp-accent-ring": withAlpha(PALETTE.accent, 0.35),
    "--sp-paper": PALETTE.paper,
    "--sp-ink": PALETTE.ink,
    "--sp-muted": PALETTE.muted,
    "--sp-hairline": PALETTE.hairline,

    // The card surface, and everything that has to stay legible on top of it.
    // A dark card flips its own text, borders and badge tint; the page around
    // it is unaffected.
    "--sp-card-bg": cardColor,
    "--sp-card-ink": cardInk,
    "--sp-card-muted": withAlpha(cardInk, onDark ? 0.72 : 0.62),
    "--sp-card-border": onDark ? withAlpha(cardInk, 0.16) : PALETTE.hairline,
    "--sp-card-shadow": onDark ? "rgba(0, 0, 0, 0.22)" : "rgba(22, 25, 26, 0.06)",
    "--sp-badge-bg": onDark ? withAlpha(cardInk, 0.14) : withAlpha(PALETTE.accent, 0.09),
    "--sp-badge-text": onDark ? cardInk : PALETTE.accent,
    "--sp-shimmer-base": withAlpha(cardInk, 0.09),
    "--sp-shimmer-highlight": withAlpha(cardInk, 0.03),

    // Held as three values because a media query cannot do arithmetic on a
    // custom property — the designer's count must never grow on small screens.
    "--sp-columns": String(cols),
    "--sp-columns-md": String(Math.min(cols, 2)),
    "--sp-columns-sm": "1",
  };
}
