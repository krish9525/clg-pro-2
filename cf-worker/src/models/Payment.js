import _mongoose from "../db.js";

const schema = new _mongoose.Schema({
  razorpay_order_id: { type: String, required: true },
  razorpay_payment_id: { type: String, required: true },
  razorpay_signature: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

let Payment;
try { Payment = _mongoose.model("Payment", schema); }
catch { Payment = _mongoose.model("Payment"); }
export { Payment };
