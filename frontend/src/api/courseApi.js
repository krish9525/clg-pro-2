import api from "./axios.js";

export const getAllCourses   = (params = {}) => api.get("/api/v1/course/all", { params });
export const getCourse       = (id)          => api.get(`/api/v1/course/${id}`);
export const getMyCourses    = ()            => api.get("/api/v1/mycourse");
export const getLectures     = (courseId)    => api.get(`/api/v1/lectures/${courseId}`);
export const getLecture      = (lectureId)   => api.get(`/api/v1/lecture/${lectureId}`);
export const checkoutCourse  = (courseId)    => api.post(`/api/v1/course/checkout/${courseId}`);
export const verifyCoursePayment = (courseId, data) =>
  api.post(`/api/v1/verification/${courseId}`, data);
export const addProgress     = (course, lectureId) =>
  api.post("/api/v1/user/progress", null, { params: { course, lectureId } });
export const getProgress     = (course) =>
  api.get("/api/v1/user/progress", { params: { course } });

// ─── Quiz ─────────────────────────────────────────────────────────────────────
export const getQuiz         = (lectureId) => api.get(`/api/v1/lecture/${lectureId}/quiz`);
export const submitQuiz      = (quizId, answers, timeTaken) =>
  api.post(`/api/v1/quiz/${quizId}/attempt`, { answers, timeTaken });
export const getMyQuizResults = (quizId)  => api.get(`/api/v1/quiz/${quizId}/results`);

// ─── Transcript ───────────────────────────────────────────────────────────────
export const getTranscript   = (lectureId) => api.get(`/api/v1/lecture/${lectureId}/transcript`);

// ─── Resources ────────────────────────────────────────────────────────────────
export const getResources    = (lectureId) => api.get(`/api/v1/lecture/${lectureId}/resources`);

// ─── Certificate ──────────────────────────────────────────────────────────────
export const getCertStatus   = (courseId)  => api.get(`/api/v1/certificate/${courseId}/status`);
export const downloadCert    = (courseId)  =>
  api.get(`/api/v1/certificate/${courseId}`, { responseType: "blob" });
export const verifyCert      = (certId)    => api.get(`/api/v1/certificate/verify/${certId}`);
