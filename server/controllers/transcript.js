import TryCatch from "../middlewares/TryCatch.js";
import { ok, fail } from "../utils/response.js";
import * as transcriptService from "../services/transcriptService.js";

const VALID_LANGS = ["en", "hi", "hinglish"];

/**
 * GET /api/v1/lecture/:id/transcript?lang=en|hi|hinglish
 * Default lang = en (original English)
 */
export const getTranscript = TryCatch(async (req, res) => {
  const lang = (req.query.lang || "en").toLowerCase();

  if (!VALID_LANGS.includes(lang)) {
    return fail(res, 400, `Invalid lang. Use: ${VALID_LANGS.join(", ")}`);
  }

  const result = await transcriptService.getTranscriptByLang(req.params.id, lang);

  ok(
    res,
    result,
    result.transcript
      ? `Transcript fetched (${lang})`
      : "No transcript available"
  );
});

/**
 * POST /api/v1/admin/lecture/:id/transcript/refresh
 * Force re-fetch from YouTube and clear all language caches
 */
export const refreshTranscript = TryCatch(async (req, res) => {
  const result = await transcriptService.refreshTranscript(req.params.id);
  ok(res, result, "Transcript refreshed (all language caches cleared)");
});
