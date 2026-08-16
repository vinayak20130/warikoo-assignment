"use client";

import type { CSSProperties } from "react";
import { addPropertyControls, ControlType } from "framer";

import { CoursesSection } from "@/components/skillpath/CoursesSection";
import { Footer } from "@/components/skillpath/Footer";
import { Hero } from "@/components/skillpath/Hero";
import { CSS } from "@/components/skillpath/styles";
import { DEFAULTS, DENSITIES, themeVars, type Density } from "@/components/skillpath/tokens";

export interface SkillPathLandingProps {
  /** Brand colour: drives the CTA, category badges, focus rings and hovers. */
  accent?: string;
  /** How tightly the course cards are packed. */
  density?: Density;
}

/**
 * The Skill Path landing page, as a single Framer code component.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export default function SkillPathLanding({
  accent = DEFAULTS.accent,
  density = DEFAULTS.density,
}: SkillPathLandingProps) {
  return (
    <div className="sp-root" style={themeVars(accent, density) as CSSProperties}>
      <style>{CSS}</style>

      <Hero />
      <main>
        <CoursesSection />
      </main>
      <Footer />
    </div>
  );
}

const title = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

addPropertyControls(SkillPathLanding, {
  accent: {
    type: ControlType.Color,
    title: "Accent",
    defaultValue: DEFAULTS.accent,
  },
  density: {
    type: ControlType.Enum,
    title: "Card density",
    options: [...DENSITIES],
    optionTitles: DENSITIES.map(title),
    defaultValue: DEFAULTS.density,
    displaySegmentedControl: true,
  },
});
