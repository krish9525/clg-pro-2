import api from "./axios.js";

export const getStats       = ()              => api.get("/api/v1/stats");
export const getAllCourses  = ()              => api.get("/api/v1/courses"); // all incl. drafts (admin only)
export const getUsers       = ()              => api.get("/api/v1/users");
export const updateUserRole = (userId)        => api.put(`/api/v1/user/${userId}`);
export const revokeAccess   = (userId, cId)   =>
  api.delete(`/api/v1/user/${userId}/course/${cId}`);
export const createCourse   = (formData)      =>
  api.post("/api/v1/course/new", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const publishCourse  = (courseId)      => api.post(`/api/v1/course/${courseId}/publish`);
export const deleteCourse   = (courseId)      => api.delete(`/api/v1/course/${courseId}`);
export const addLecture     = (courseId, data) => api.post(`/api/v1/course/${courseId}`, data);
export const deleteLecture  = (lectureId)     => api.delete(`/api/v1/lecture/${lectureId}`);

// ─── Quiz admin ───────────────────────────────────────────────────────────────
export const saveQuiz       = (lectureId, data) => api.post(`/api/v1/admin/lecture/${lectureId}/quiz`, data);
export const getQuizAdmin   = (lectureId)       => api.get(`/api/v1/admin/lecture/${lectureId}/quiz`);
export const deleteQuiz     = (lectureId)       => api.delete(`/api/v1/admin/lecture/${lectureId}/quiz`);

// ─── Resource admin ───────────────────────────────────────────────────────────
export const uploadResource = (lectureId, formData) =>
  api.post(`/api/v1/admin/lecture/${lectureId}/resource`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const deleteResource = (lectureId, resourceId) =>
  api.delete(`/api/v1/admin/lecture/${lectureId}/resource/${resourceId}`);

// ─── Transcript admin ─────────────────────────────────────────────────────────
export const refreshTranscript = (lectureId) =>
  api.post(`/api/v1/admin/lecture/${lectureId}/transcript/refresh`);
