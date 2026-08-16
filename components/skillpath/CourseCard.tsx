"use client";

import { motion, useReducedMotion } from "framer-motion";
import { formatPrice } from "@/lib/price";
import type { CountryCode, Course } from "@/lib/types";

interface CourseCardProps {
  course: Course;
  country: CountryCode;
  index: number;
}

export function CourseCard({ course, country, index }: CourseCardProps) {
  const reduceMotion = useReducedMotion();
  const price = formatPrice(course, country);

  // The stagger is capped so the last card in a ten-card grid does not
  // arrive noticeably late.
  const entrance = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: {
          duration: 0.4,
          delay: Math.min(index, 8) * 0.045,
          ease: [0.22, 1, 0.36, 1] as const,
        },
      };

  return (
    <motion.article className="sp-card" {...entrance}>
      {course.mainCategory ? <span className="sp-badge">{course.mainCategory}</span> : null}

      <h3 className="sp-card-title">{course.courseName}</h3>
      <p className="sp-card-desc">{course.description}</p>

      <div className="sp-card-foot">
        <span className="sp-price">{price}</span>
      </div>
    </motion.article>
  );
}
