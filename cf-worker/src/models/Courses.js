import _mongoose from "../db.js";

const schema = new _mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true },
  duration: { type: Number, required: true },
  category: { type: String, required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

let Courses;
try { Courses = _mongoose.model("Courses", schema); }
catch { Courses = _mongoose.model("Courses"); }
export { Courses };
