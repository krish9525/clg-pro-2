import { create } from "zustand";
import { persist } from "zustand/middleware";
import toast from "react-hot-toast";
import * as userApi from "../api/userApi.js";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuth: false,
      loading: true,
      btnLoading: false,

      // ─── Bootstrap: called on app mount ───────────────────────────────────
      fetchUser: async () => {
        try {
          const { data } = await userApi.fetchMe();
          set({ user: data.data?.user ?? data.user, isAuth: true, loading: false });
        } catch {
          set({ user: null, isAuth: false, loading: false });
        }
      },

      // ─── Auth ─────────────────────────────────────────────────────────────
      login: async (email, password, navigate, onSuccess) => {
        set({ btnLoading: true });
        try {
          const { data } = await userApi.loginUser({ email, password });
          const user = data.data?.user ?? data.user;
          const token = data.data?.token ?? data.token;

          if (token) localStorage.setItem("token", token); // backward-compat
          set({ user, isAuth: true, btnLoading: false });
          toast.success(data.message);
          if (onSuccess) onSuccess();
          navigate("/");
        } catch (error) {
          set({ btnLoading: false });
          toast.error(error.response?.data?.message || "Login failed");
        }
      },

      logout: async (navigate) => {
        try {
          await userApi.logoutUser();
        } catch (_) { /* best-effort */ }
        localStorage.removeItem("token");
        set({ user: null, isAuth: false });
        toast.success("Logged out successfully 👋");
        if (navigate) navigate("/login");
      },

      register: async (name, email, password, navigate) => {
        set({ btnLoading: true });
        try {
          const { data } = await userApi.registerUser({ name, email, password });
          const token = data.data?.activationToken ?? data.activationToken;
          localStorage.setItem("activationToken", token);
          set({ btnLoading: false });
          toast.success(data.message);
          navigate("/verify");
        } catch (error) {
          set({ btnLoading: false });
          toast.error(error.response?.data?.message || "Registration failed");
        }
      },

      verifyOtp: async (otp, navigate) => {
        set({ btnLoading: true });
        const activationToken = localStorage.getItem("activationToken");
        try {
          const { data } = await userApi.verifyOtp({ otp: Number(otp), activationToken });
          localStorage.removeItem("activationToken");
          set({ btnLoading: false });
          toast.success(data.message);
          navigate("/login");
        } catch (error) {
          set({ btnLoading: false });
          toast.error(error.response?.data?.message || "Verification failed");
        }
      },

      // ─── setters (kept for backward-compat with existing components) ──────
      setUser:   (user)   => set({ user }),
      setIsAuth: (isAuth) => set({ isAuth }),
    }),
    {
      name: "auth-store",
      partialize: (state) => ({ user: state.user, isAuth: state.isAuth }),
    }
  )
);
