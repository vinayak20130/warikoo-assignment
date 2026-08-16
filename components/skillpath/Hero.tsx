"use client";

import { motion, useReducedMotion } from "framer-motion";

const rise = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0 },
};

export function Hero() {
  const reduceMotion = useReducedMotion();

  // One orchestrated entrance rather than effects scattered over the page.
  const sequence = reduceMotion
    ? {}
    : {
        initial: "hidden" as const,
        animate: "shown" as const,
        variants: rise,
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <header className="sp-hero">
      <div className="sp-shell">
        <div className="sp-wordmark">
          <span className="sp-wordmark-dot" aria-hidden="true" />
          Skill Path
        </div>

        <motion.h1 className="sp-headline" {...sequence}>
          Short courses that end in something you built.
        </motion.h1>

        <motion.p
          className="sp-subhead"
          {...sequence}
          transition={{ ...sequence.transition, delay: reduceMotion ? 0 : 0.08 }}
        >
          Pick one, finish it over a weekend, and walk away with a channel, a system, or your
          first paying client — not a folder of notes.
        </motion.p>

        <motion.a
          className="sp-cta"
          href="#courses"
          {...sequence}
          transition={{ ...sequence.transition, delay: reduceMotion ? 0 : 0.16 }}
        >
          Browse courses
          <span className="sp-cta-arrow" aria-hidden="true">
            →
          </span>
        </motion.a>
      </div>
    </header>
  );
}
