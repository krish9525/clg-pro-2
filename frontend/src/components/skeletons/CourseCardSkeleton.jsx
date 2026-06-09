import "./skeleton.css";

/**
 * Skeleton placeholder for CourseCard while courses are loading.
 * Matches the CourseCard dimensions so there's no layout shift.
 */
const CourseCardSkeleton = () => (
  <div className="skeleton-card">
    <div className="skeleton skeleton-image" />
    <div className="skeleton-body">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-subtitle" />
      <div className="skeleton skeleton-meta" />
      <div className="skeleton skeleton-price" />
    </div>
  </div>
);

/**
 * Renders N skeleton cards in a grid.
 */
export const CourseSkeletonGrid = ({ count = 6 }) => (
  <div className="skeleton-grid">
    {Array.from({ length: count }).map((_, i) => (
      <CourseCardSkeleton key={i} />
    ))}
  </div>
);

export default CourseCardSkeleton;
