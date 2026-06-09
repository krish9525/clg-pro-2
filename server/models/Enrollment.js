import mongoose from "mongoose";

/**
 * Enrollment — the canonical record of a user being enrolled in a course.
 *
 * This model replaces the embedded `subscription` array on the User model.
 * The User.subscription array is kept for backward compatibility during migration.
 *
 * Benefits over embedded array:
 *  - Query enrollments without loading full User document
 *  - Track enrollment date, expiry, and payment reference
 *  - Easily list all students in a course (admin view)
 */
const schema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Courses",
      required: true,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    // Optional: time-limited access (null = lifetime)
    expiresAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Compound unique: one enrollment per user per course
schema.index({ user: 1, course: 1 }, { unique: true });
schema.index({ course: 1, isActive: 1 });
schema.index({ user: 1, isActive: 1 });

export const Enrollment = mongoose.model("Enrollment", schema);
