/**
 * One stylesheet, injected once by the root component.
 *
 * Framer code components cannot use Tailwind (there is no build step for
 * utility classes) and inline style objects cannot express hover, media
 * queries, focus rings or line clamping. A scoped `<style>` block reading CSS
 * custom properties gives us all of it, in Next and in Framer alike, and lets
 * the two property controls flow through a single set of variables.
 *
 * The font variables are deliberately left undefined here: the Next app sets
 * them from next/font, and anywhere else the fallback stack applies.
 */
export const CSS = `
.sp-root {
  --sp-shell: 1120px;
  background: var(--sp-paper);
  color: var(--sp-ink);
  font-family: var(--sp-font-body, "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
  font-size: 16px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
.sp-root *,
.sp-root *::before,
.sp-root *::after { box-sizing: border-box; }

.sp-shell {
  width: 100%;
  max-width: var(--sp-shell);
  margin: 0 auto;
  padding: 0 24px;
}

.sp-root :focus-visible {
  outline: 2px solid var(--sp-accent);
  outline-offset: 3px;
  border-radius: 4px;
}

/* ---------- hero ---------- */

.sp-hero { padding: 40px 0 88px; }

.sp-wordmark {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin-bottom: 72px;
}
.sp-wordmark-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: var(--sp-accent);
}

.sp-headline {
  margin: 0;
  max-width: 16ch;
  font-family: var(--sp-font-display, "Bricolage Grotesque", "Inter", system-ui, sans-serif);
  font-size: clamp(38px, 6.4vw, 66px);
  font-weight: 700;
  line-height: 1.04;
  letter-spacing: -0.035em;
}

.sp-subhead {
  margin: 24px 0 0;
  max-width: 52ch;
  font-size: 18px;
  line-height: 1.6;
  color: var(--sp-muted);
}

.sp-cta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 36px;
  padding: 14px 26px;
  border: none;
  border-radius: 999px;
  background: var(--sp-accent);
  color: var(--sp-accent-contrast);
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease;
}
.sp-cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 22px var(--sp-accent-ring);
}
.sp-cta-arrow { transition: transform 160ms ease; }
.sp-cta:hover .sp-cta-arrow { transform: translateX(3px); }

/* ---------- section header ---------- */

.sp-courses { padding-bottom: 96px; scroll-margin-top: 24px; }

.sp-section-head {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: 20px;
  margin-bottom: 32px;
  border-bottom: 1px solid var(--sp-hairline);
}

.sp-section-title {
  margin: 0;
  font-family: var(--sp-font-display, "Bricolage Grotesque", "Inter", system-ui, sans-serif);
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.025em;
}
.sp-section-count {
  margin: 6px 0 0;
  font-size: 14px;
  color: var(--sp-muted);
}

/* ---------- grid + cards ---------- */

.sp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(288px, 1fr));
  gap: var(--sp-grid-gap);
  align-items: stretch;
}

.sp-card {
  display: flex;
  flex-direction: column;
  padding: var(--sp-card-padding);
  border: 1px solid var(--sp-hairline);
  border-radius: var(--sp-card-radius);
  background: var(--sp-surface);
  transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
}
.sp-card:hover {
  border-color: var(--sp-accent-ring);
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(22, 25, 26, 0.06);
}

.sp-badge {
  align-self: flex-start;
  padding: 5px 11px;
  border-radius: 999px;
  background: var(--sp-accent-tint);
  color: var(--sp-accent-text);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sp-card-title {
  margin: 16px 0 0;
  font-family: var(--sp-font-display, "Bricolage Grotesque", "Inter", system-ui, sans-serif);
  font-size: var(--sp-title-size);
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.015em;
}

/* Exactly two lines, ellipsised at the word rather than mid-glyph. */
.sp-card-desc {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  /* The bottom margin keeps the footer rule off the descenders of the second
     line, which margin-top:auto alone cannot guarantee once a row of cards
     stretches to equal height. */
  margin: 10px 0 22px;
  min-height: 2.9em;
  font-size: 14.5px;
  line-height: 1.45;
  color: var(--sp-muted);
}

.sp-card-foot {
  display: flex;
  align-items: baseline;
  gap: 12px;
  /* Pushes the price to the bottom so it lines up across a row of cards
     whose titles wrap to different heights. */
  margin-top: auto;
  padding-top: 18px;
  border-top: 1px solid var(--sp-hairline);
}

.sp-price {
  font-size: 19px;
  font-weight: 650;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}

/* ---------- loading ---------- */

.sp-skeleton-card {
  padding: var(--sp-card-padding);
  border: 1px solid var(--sp-hairline);
  border-radius: var(--sp-card-radius);
  background: var(--sp-surface);
}
.sp-shimmer {
  border-radius: 6px;
  background: linear-gradient(90deg, #ECEEEB 25%, #F5F6F4 50%, #ECEEEB 75%);
  background-size: 200% 100%;
  animation: sp-shimmer 1.4s ease-in-out infinite;
}
.sp-shimmer + .sp-shimmer { margin-top: 12px; }
@keyframes sp-shimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}
.sp-loading-note {
  margin: 24px 0 0;
  font-size: 14px;
  color: var(--sp-muted);
}

/* ---------- error + empty ---------- */

.sp-panel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 48px var(--sp-card-padding);
  border: 1px solid var(--sp-hairline);
  border-radius: var(--sp-card-radius);
  background: var(--sp-surface);
}
.sp-panel-title {
  margin: 0;
  font-family: var(--sp-font-display, "Bricolage Grotesque", "Inter", system-ui, sans-serif);
  font-size: 21px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.sp-panel-body {
  margin: 10px 0 0;
  max-width: 52ch;
  font-size: 15px;
  color: var(--sp-muted);
}
.sp-panel-meta {
  margin: 14px 0 0;
  font-size: 13px;
  color: var(--sp-muted);
  font-variant-numeric: tabular-nums;
}
.sp-retry {
  margin-top: 24px;
  padding: 11px 22px;
  border: 1px solid var(--sp-accent);
  border-radius: 999px;
  background: var(--sp-accent);
  color: var(--sp-accent-contrast);
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease;
}
.sp-retry:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 22px var(--sp-accent-ring);
}

/* ---------- footer ---------- */

.sp-footer {
  border-top: 1px solid var(--sp-hairline);
  padding: 32px 0 44px;
}
.sp-footer-inner {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 32px;
  align-items: center;
  justify-content: space-between;
}
.sp-footer-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 28px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.sp-footer-link {
  color: var(--sp-muted);
  font-size: 14.5px;
  text-decoration: none;
  transition: color 140ms ease;
}
.sp-footer-link:hover {
  color: var(--sp-accent);
  text-decoration: underline;
  text-underline-offset: 4px;
}
.sp-footer-note {
  margin: 0;
  font-size: 13.5px;
  color: var(--sp-muted);
}

/* ---------- responsive ---------- */

@media (max-width: 640px) {
  .sp-shell { padding: 0 20px; }
  .sp-hero { padding: 28px 0 64px; }
  .sp-wordmark { margin-bottom: 48px; }
  .sp-subhead { font-size: 16.5px; }
  .sp-courses { padding-bottom: 72px; }
  .sp-section-head { align-items: flex-start; }
  .sp-panel { padding: 36px 24px; }
}

@media (prefers-reduced-motion: reduce) {
  .sp-root *,
  .sp-root *::before,
  .sp-root *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
`;
