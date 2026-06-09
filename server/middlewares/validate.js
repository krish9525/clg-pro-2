import Joi from "joi";

/**
 * Factory: returns an Express middleware that validates req.body against a Joi schema.
 * On failure → 422 Unprocessable Entity with a clear message.
 */
export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((d) => d.message).join("; ");
    return res.status(422).json({ success: false, message: messages });
  }
  next();
};

// ─── Auth Schemas ────────────────────────────────────────────────────────────

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(60).required().messages({
    "string.min": "Name must be at least 2 characters",
    "string.max": "Name must be at most 60 characters",
    "any.required": "Name is required",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(8).max(128).required().messages({
    "string.min": "Password must be at least 8 characters",
    "any.required": "Password is required",
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
});

export const verifyOtpSchema = Joi.object({
  otp: Joi.number().integer().min(0).max(999999).required().messages({
    "number.base": "OTP must be a number",
    "any.required": "OTP is required",
  }),
  activationToken: Joi.string().required().messages({
    "any.required": "Activation token is required",
  }),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
});

export const resetPasswordSchema = Joi.object({
  password: Joi.string().min(8).max(128).required().messages({
    "string.min": "Password must be at least 8 characters",
    "any.required": "New password is required",
  }),
});
