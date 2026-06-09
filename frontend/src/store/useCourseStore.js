import { create } from "zustand";
import * as courseApi from "../api/courseApi.js";

export const useCourseStore = create((set, get) => ({
  courses: [],
  course: null,
  myCourses: [],
  courseLoading: false,

  // ─── Fetch all published courses ───────────────────────────────────────────
  fetchCourses: async (filters = {}) => {
    set({ courseLoading: true });
    try {
      const { data } = await courseApi.getAllCourses(filters);
      // paginated() returns data.data as a direct array
      // ok() returns data.data as { courses: [...] }
      const raw = data.data;
      const list = Array.isArray(raw) ? raw : (raw?.courses ?? data.courses ?? []);
      set({ courses: list, courseLoading: false });
    } catch {
      set({ courseLoading: false });
    }
  },

  // ─── Fetch single course ───────────────────────────────────────────────────
  fetchCourse: async (id) => {
    try {
      const { data } = await courseApi.getCourse(id);
      set({ course: data.data?.course ?? data.course });
    } catch (err) {
      console.error("fetchCourse error:", err.message);
    }
  },

  // ─── Fetch enrolled courses ────────────────────────────────────────────────
  fetchMyCourse: async () => {
    try {
      const { data } = await courseApi.getMyCourses();
      set({ myCourses: data.data?.courses ?? data.courses ?? [] });
    } catch {
      set({ myCourses: [] });
    }
  },

  // ─── Setters ──────────────────────────────────────────────────────────────
  setCourses:   (courses)   => set({ courses }),
  setCourse:    (course)    => set({ course }),
  setMyCourses: (myCourses) => set({ myCourses }),
}));
