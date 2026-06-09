import { YoutubeTranscript } from "youtube-transcript";
import { Lecture }           from "../models/Lecture.js";

/**
 * Fetch transcript for a lecture.
 * Uses cached version if available (< 7 days old).
 * Falls back to empty string if YouTube has no captions.
 */
export const getLectureTranscript = async (lectureId) => {
  const lecture = await Lecture.findById(lectureId);
  if (!lecture) {
    const e = new Error("Lecture not found"); e.statusCode = 404; throw e;
  }

  // Return cached transcript if fresh (< 7 days)
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  if (
    lecture.transcript &&
    lecture.transcriptFetchedAt &&
    Date.now() - lecture.transcriptFetchedAt.getTime() < SEVEN_DAYS
  ) {
    return { transcript: lecture.transcript, source: "cache" };
  }

  // Extract YouTube video ID
  const videoId = extractYouTubeId(lecture.video);
  if (!videoId) {
    return { transcript: "", source: "none", error: "Invalid YouTube video ID" };
  }

  try {
    const entries = await YoutubeTranscript.fetchTranscript(videoId);
    const transcript = entries
      .map((e) => e.text.replace(/\n/g, " ").trim())
      .filter(Boolean)
      .join(" ");

    // Cache it
    lecture.transcript          = transcript;
    lecture.transcriptFetchedAt = new Date();
    await lecture.save();

    return { transcript, source: "youtube" };
  } catch (err) {
    // Transcript not available — still cache empty to avoid repeated fetches
    lecture.transcript          = "";
    lecture.transcriptFetchedAt = new Date();
    await lecture.save();

    const reason =
      err.message?.includes("disabled")     ? "Transcripts are disabled for this video" :
      err.message?.includes("unavailable")  ? "Video not available"                      :
      err.message?.includes("not available")? "No transcript available for this video"   :
      "Transcript unavailable";

    return { transcript: "", source: "none", error: reason };
  }
};

/** Force-refresh transcript (ignore cache) */
export const refreshTranscript = async (lectureId) => {
  await Lecture.findByIdAndUpdate(lectureId, { transcript: "", transcriptFetchedAt: null });
  return getLectureTranscript(lectureId);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractYouTubeId(url = "") {
  if (!url) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
  const regex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const m = url.match(regex);
  return m ? m[1] : null;
}
