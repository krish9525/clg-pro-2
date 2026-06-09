import _mongoose from "../db.js";

const schema = new _mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "user" },
    mainrole: { type: String, default: "user" },
    subscription: [{ type: _mongoose.Schema.Types.ObjectId, ref: "Courses" }],
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

let User;
try { User = _mongoose.model("User", schema); }
catch { User = _mongoose.model("User"); }
export { User };
