import axios from "axios";

// Base URL: empty in production (nginx proxies /api → backend), explicit in dev
const BASE_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV ? "http://localhost:8002" : "");

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send httpOnly cookie on every request
  headers: { "Content-Type": "application/json" },
});

// ─── Request interceptor — attach legacy token header during migration ────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.token = token; // backward-compat; remove in v2
  return config;
});

// ─── Response interceptor — silent token refresh on 401 ─────────────────────
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only attempt refresh on 401, and not on the refresh endpoint itself
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes("/user/refresh-token") &&
      !original.url?.includes("/user/login")
    ) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              original.headers.token = token;
              resolve(api(original));
            },
            reject,
          });
        });
      }

      original._retry   = true;
      isRefreshing      = true;

      try {
        const { data } = await api.post("/api/v1/user/refresh-token");
        const newToken  = data.data?.token ?? data.token;

        if (newToken) {
          localStorage.setItem("token", newToken);
          api.defaults.headers.common.token = newToken;
          original.headers.token            = newToken;
          processQueue(null, newToken);
          return api(original);
        }
      } catch (refreshError) {
        processQueue(refreshError);
        localStorage.removeItem("token");
        // Redirect to login if refresh also fails
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
