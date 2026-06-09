import api from "./axios.js";

export const registerUser  = (data)  => api.post("/api/v1/user/register", data);
export const verifyOtp     = (data)  => api.post("/api/v1/user/verify", data);
export const loginUser     = (data)  => api.post("/api/v1/user/login", data);
export const logoutUser    = ()      => api.post("/api/v1/user/logout");
export const fetchMe       = ()      => api.get("/api/v1/user/me");
export const fetchAdmin    = ()      => api.get("/api/v1/user/admin");
export const forgotPassword  = (data)        => api.post("/api/v1/user/forgot", data);
export const resetPassword   = (data, token) => api.post(`/api/v1/user/reset?token=${token}`, data);
export const refreshToken    = ()            => api.post("/api/v1/user/refresh-token");
