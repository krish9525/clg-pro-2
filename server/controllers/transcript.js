import TryCatch from "../middlewares/TryCatch.js";
import { ok }   from "../utils/response.js";
import * as transcriptService from "../services/transcriptService.js";

/** GET /api/v1/lecture/:id/transcript */
export const getTranscript = TryCatch(async (req, res) => {
  const result = await transcriptService.getLectureTranscript(req.params.id);
  ok(res, result, result.transcript ? "Transcript fetched" : "No transcript available");
});

/** POST /api/v1/admin/lecture/:id/transcript/refresh — force re-fetch */
export const refreshTranscript = TryCatch(async (req, res) => {
  const result = await transcriptService.refreshTranscript(req.params.id);
  ok(res, result, "Transcript refreshed");
});
