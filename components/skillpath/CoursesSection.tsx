"use client";

import { CourseCard } from "@/components/skillpath/CourseCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/skillpath/StateViews";
import { useCourses } from "@/lib/useCourses";

export function CoursesSection() {
  const { status, courses, country, error, attempt, retry } = useCourses();

  return (
    <section className="sp-courses" id="courses">
      <div className="sp-shell">
        <div className="sp-section-head">
          <div>
            <h2 className="sp-section-title">Courses</h2>
            <p className="sp-section-count">
              {status === "ready"
                ? `${courses.length} ${courses.length === 1 ? "course" : "courses"} available now`
                : "Loaded fresh on every visit"}
            </p>
          </div>
        </div>

        {status === "loading" ? <LoadingState attempt={attempt} /> : null}
        {status === "error" ? <ErrorState error={error} onRetry={retry} /> : null}
        {status === "empty" ? <EmptyState onRefresh={retry} /> : null}
        {status === "ready" ? (
          <div className="sp-grid">
            {courses.map((course, index) => (
              <CourseCard
                key={course.courseCode || course.mangoId || index}
                course={course}
                country={country}
                index={index}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
