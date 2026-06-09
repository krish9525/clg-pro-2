import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    question:     { type: String, required: true, trim: true },
    options:      { type: [String], validate: (a) => a.length === 4, required: true },
    correctIndex: { type: Number, min: 0, max: 3, required: true },
    explanation:  { type: String, default: "" }, // shown after attempt
  },
  { _id: true }
);

const schema = new mongoose.Schema(
  {
    lecture:      { type: mongoose.Schema.Types.ObjectId, ref: "Lecture", required: true, unique: true },
    course:       { type: mongoose.Schema.Types.ObjectId, ref: "Courses", required: true },
    questions:    { type: [questionSchema], default: [] },
    passingScore: { type: Number, default: 70, min: 0, max: 100 }, // percentage
    timeLimit:    { type: Number, default: 0 },   // minutes, 0 = unlimited
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

schema.index({ course: 1 });

export const Quiz = mongoose.model("Quiz", schema);
