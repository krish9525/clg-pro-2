import Razorpay from "razorpay";

/**
 * Lazy Razorpay singleton — only instantiated on first use.
 * Prevents server crash if Razorpay keys are missing at startup.
 */
let _instance = null;

export const getRazorpay = () => {
  if (!_instance) {
    if (!process.env.Razorpay_Key || !process.env.Razorpay_Secret) {
      throw new Error("Razorpay keys (Razorpay_Key, Razorpay_Secret) are not configured in .env");
    }
    _instance = new Razorpay({
      key_id: process.env.Razorpay_Key,
      key_secret: process.env.Razorpay_Secret,
    });
  }
  return _instance;
};

/**
 * Backward-compat shim — used by paymentService.js
 */
export const instance = {
  orders: {
    create: (options) => getRazorpay().orders.create(options),
  },
};
