import _mongoose from "../db.js";

const schema = new _mongoose.Schema(
  {
    course: { type: _mongoose.Schema.Types.ObjectId, ref: "Courses" },
    completedLectures: [{ type: _mongoose.Schema.Types.ObjectId, ref: "Lecture" }],
    user: { type: _mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

let Progress;
try { Progress = _mongoose.model("Progress", schema); }
catch { Progress = _mongoose.model("Progress"); }
export { Progress };
