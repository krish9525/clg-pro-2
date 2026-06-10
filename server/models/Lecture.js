import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true },
    url:      { type: String, required: true },
    fileType: { type: String, default: "file" },
    size:     { type: Number, default: 0 },
  },
  { _id: true, timestamps: true }
);

const schema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  video: {
    type: String,
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Courses",
    required: true,
  },
  // ─── Resources (PDFs, slides, etc.) ───────────────────────────────────────
  resources: {
    type: [resourceSchema],
    default: [],
  },
  // ─── Transcript (cached from YouTube) ─────────────────────────────────────
  transcript:                 { type: String, default: "" },
  transcriptFetchedAt:        { type: Date,   default: null },
  // Translated versions (cached)
  transcriptHi:               { type: String, default: "" },
  transcriptHiFetchedAt:      { type: Date,   default: null },
  transcriptHinglish:         { type: String, default: "" },
  transcriptHinglishFetchedAt:{ type: Date,   default: null },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Lecture = mongoose.model("Lecture", schema);
