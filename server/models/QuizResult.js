import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    quiz:          { type: mongoose.Schema.Types.ObjectId, ref: "Quiz",    required: true },
    lecture:       { type: mongoose.Schema.Types.ObjectId, ref: "Lecture", required: true },
    course:        { type: mongoose.Schema.Types.ObjectId, ref: "Courses", required: true },
    user:          { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
    answers:       { type: [Number], required: true }, // selected option indices
    score:         { type: Number, required: true },   // percentage 0-100
    passed:        { type: Boolean, required: true },
    attemptNumber: { type: Number, default: 1 },
    timeTaken:     { type: Number, default: 0 },       // seconds
  },
  { timestamps: true }
);

// One result per attempt; multiple attempts allowed
schema.index({ user: 1, quiz: 1 });
schema.index({ user: 1, course: 1 });

export const QuizResult = mongoose.model("QuizResult", schema);
