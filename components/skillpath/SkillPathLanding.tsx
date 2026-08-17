"use client";

import type { CSSProperties } from "react";
import { addPropertyControls, ControlType } from "framer";

import { CoursesSection } from "@/components/skillpath/CoursesSection";
import { Footer } from "@/components/skillpath/Footer";
import { Hero } from "@/components/skillpath/Hero";
import { CSS } from "@/components/skillpath/styles";
import {
  DEFAULTS,
  MAX_COLUMNS,
  MIN_COLUMNS,
  themeVars,
} from "@/components/skillpath/tokens";

export interface SkillPathLandingProps {
  /** Background of the course cards. Text on them adapts to stay readable. */
  cardColor?: string;
  /** How many cards sit in a row on a wide screen. */
  columns?: number;
}

/**
 * The Skill Path landing page, as a single Framer code component.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export default function SkillPathLanding({
  cardColor = DEFAULTS.cardColor,
  columns = DEFAULTS.columns,
}: SkillPathLandingProps) {
  return (
    <div className="sp-root" style={themeVars(cardColor, columns) as CSSProperties}>
      <style>{CSS}</style>

      <Hero />
      <main>
        <CoursesSection />
      </main>
      <Footer />
    </div>
  );
}

addPropertyControls(SkillPathLanding, {
  cardColor: {
    type: ControlType.Color,
    title: "Card colour",
    defaultValue: DEFAULTS.cardColor,
  },
  columns: {
    type: ControlType.Number,
    title: "Cards per row",
    defaultValue: DEFAULTS.columns,
    min: MIN_COLUMNS,
    max: MAX_COLUMNS,
    step: 1,
    displayStepper: true,
  },
});
