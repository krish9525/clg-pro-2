import _mongoose from "../db.js";

const schema = new _mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  video: { type: String, required: true },
  course: { type: _mongoose.Schema.Types.ObjectId, ref: "Courses", required: true },
  createdAt: { type: Date, default: Date.now },
});

let Lecture;
try { Lecture = _mongoose.model("Lecture", schema); }
catch { Lecture = _mongoose.model("Lecture"); }
export { Lecture };
