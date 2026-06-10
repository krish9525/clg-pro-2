import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Courses",
    },
    completedLectures: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lecture",
      },
    ],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // ─── Certificate ─────────────────────────────────────────────────────────
    certificateEarned:   { type: Boolean, default: false },
    certificateEarnedAt: { type: Date,    default: null  },
    certificateId:       { type: String,  default: null  },
  },
  {
    timestamps: true,
  }
);

export const Progress = mongoose.model("Progress", schema);
