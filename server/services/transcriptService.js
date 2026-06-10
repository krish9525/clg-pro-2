import { YoutubeTranscript } from "youtube-transcript";
import { Lecture }           from "../models/Lecture.js";

const SEVEN_DAYS  = 7 * 24 * 60 * 60 * 1000;
const CHUNK_CHARS = 450;    // MyMemory segment limit ~500 chars
const CHUNK_DELAY = 250;    // ms between API calls

// ─── YouTube transcript fetch ─────────────────────────────────────────────────

export const getLectureTranscript = async (lectureId) => {
  const lecture = await Lecture.findById(lectureId);
  if (!lecture) {
    const e = new Error("Lecture not found"); e.statusCode = 404; throw e;
  }

  if (
    lecture.transcript &&
    lecture.transcriptFetchedAt &&
    Date.now() - lecture.transcriptFetchedAt.getTime() < SEVEN_DAYS
  ) {
    return { transcript: lecture.transcript, source: "cache" };
  }

  const videoId = extractYouTubeId(lecture.video);
  if (!videoId) {
    return { transcript: "", source: "none", error: "Invalid YouTube video ID" };
  }

  try {
    const entries    = await YoutubeTranscript.fetchTranscript(videoId);
    const transcript = entries
      .map((e) => e.text.replace(/\n/g, " ").trim())
      .filter(Boolean)
      .join(" ");

    lecture.transcript          = transcript;
    lecture.transcriptFetchedAt = new Date();
    await lecture.save();
    return { transcript, source: "youtube" };
  } catch (err) {
    lecture.transcript          = "";
    lecture.transcriptFetchedAt = new Date();
    await lecture.save();

    const reason =
      err.message?.includes("disabled")      ? "Transcripts are disabled for this video" :
      err.message?.includes("unavailable")   ? "Video not available"                      :
      err.message?.includes("not available") ? "No transcript available for this video"   :
      "Transcript unavailable";

    return { transcript: "", source: "none", error: reason };
  }
};

// ─── Multi-language transcripts ───────────────────────────────────────────────

export const getTranscriptByLang = async (lectureId, lang = "en") => {
  if (lang === "en") return getLectureTranscript(lectureId);

  const lecture = await Lecture.findById(lectureId);
  if (!lecture) {
    const e = new Error("Lecture not found"); e.statusCode = 404; throw e;
  }

  // ── Hindi (Devanagari) ────────────────────────────────────────────────────
  if (lang === "hi") {
    if (
      lecture.transcriptHi &&
      lecture.transcriptHiFetchedAt &&
      Date.now() - lecture.transcriptHiFetchedAt.getTime() < SEVEN_DAYS
    ) {
      return { transcript: lecture.transcriptHi, source: "cache", lang: "hi" };
    }

    const enResult = await getLectureTranscript(lectureId);
    if (!enResult.transcript) {
      return { transcript: "", source: "none", error: enResult.error || "No source transcript", lang: "hi" };
    }

    try {
      const hindi = await translateChunked(enResult.transcript, "en", "hi");
      await Lecture.findByIdAndUpdate(lectureId, {
        transcriptHi:          hindi,
        transcriptHiFetchedAt: new Date(),
      });
      return { transcript: hindi, source: "translated", lang: "hi" };
    } catch (err) {
      console.error("[Transcript/hi]", err.message);
      return { transcript: "", source: "error", error: "Translation to Hindi failed. Please try again.", lang: "hi" };
    }
  }

  // ── Hinglish (Roman-script Hindi) ─────────────────────────────────────────
  if (lang === "hinglish") {
    if (
      lecture.transcriptHinglish &&
      lecture.transcriptHinglishFetchedAt &&
      Date.now() - lecture.transcriptHinglishFetchedAt.getTime() < SEVEN_DAYS
    ) {
      return { transcript: lecture.transcriptHinglish, source: "cache", lang: "hinglish" };
    }

    const enResult = await getLectureTranscript(lectureId);
    if (!enResult.transcript) {
      return { transcript: "", source: "none", error: enResult.error || "No source transcript", lang: "hinglish" };
    }

    try {
      // Step 1: translate to Hindi (Devanagari)
      const hindi    = await translateChunked(enResult.transcript, "en", "hi");
      // Step 2: convert Devanagari → phonetic Roman (Hinglish)
      const hinglish = devanagariToRoman(hindi);

      await Lecture.findByIdAndUpdate(lectureId, {
        transcriptHinglish:          hinglish,
        transcriptHinglishFetchedAt: new Date(),
      });
      return { transcript: hinglish, source: "translated", lang: "hinglish" };
    } catch (err) {
      console.error("[Transcript/hinglish]", err.message);
      return { transcript: "", source: "error", error: "Hinglish translation failed. Please try again.", lang: "hinglish" };
    }
  }

  return { transcript: "", source: "none", error: "Unknown language", lang };
};

export const refreshTranscript = async (lectureId) => {
  await Lecture.findByIdAndUpdate(lectureId, {
    transcript: "",              transcriptFetchedAt: null,
    transcriptHi: "",           transcriptHiFetchedAt: null,
    transcriptHinglish: "",     transcriptHinglishFetchedAt: null,
  });
  return getLectureTranscript(lectureId);
};

// ─── MyMemory Translation API (free, no key needed) ──────────────────────────

async function myMemoryTranslate(text, from, to) {
  const url =
    `https://api.mymemory.translated.net/get` +
    `?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;

  const res  = await fetch(url);
  const json = await res.json();

  if (json.responseStatus !== 200 && json.responseStatus !== "200") {
    throw new Error(`MyMemory error: ${json.responseDetails || json.responseStatus}`);
  }

  const translated = json.responseData?.translatedText;
  if (!translated) throw new Error("Empty translation response");

  // MyMemory sometimes returns "PLEASE SELECT TWO DISTINCT LANGUAGES" for same-lang input
  if (translated.includes("PLEASE SELECT")) {
    throw new Error("MyMemory language error");
  }

  return translated;
}

/** Translate a long text in sentence-sized chunks via MyMemory */
async function translateChunked(text, from, to) {
  const chunks  = chunkText(text, CHUNK_CHARS);
  const results = [];

  for (let i = 0; i < chunks.length; i++) {
    const translated = await myMemoryTranslate(chunks[i], from, to);
    results.push(translated);
    if (i < chunks.length - 1) {
      await new Promise((r) => setTimeout(r, CHUNK_DELAY));
    }
  }

  return results.join(" ");
}

// ─── Devanagari → Phonetic Roman (Hinglish) ──────────────────────────────────

const VOWELS = {
  "अ":"a","आ":"aa","इ":"i","ई":"ee","उ":"u","ऊ":"oo",
  "ऋ":"ri","ए":"e","ऐ":"ai","ओ":"o","औ":"au","अं":"an","अः":"ah",
};

const VOWEL_SIGNS = {
  "ा":"aa", // ा
  "ि":"i",  // ि
  "ी":"ee", // ी
  "ु":"u",  // ु
  "ू":"oo", // ू
  "ृ":"ri", // ृ
  "े":"e",  // े
  "ै":"ai", // ै
  "ो":"o",  // ो
  "ौ":"au", // ौ
  "ं":"n",  // ं (anusvara)
  "ः":"h",  // ः (visarga)
  "्":"",   // ् (halant — suppress inherent 'a')
};

const CONSONANTS = {
  "क":"k","ख":"kh","ग":"g","घ":"gh","ङ":"ng",
  "च":"ch","छ":"chh","ज":"j","झ":"jh","ञ":"ny",
  "ट":"t","ठ":"th","ड":"d","ढ":"dh","ण":"n",
  "त":"t","थ":"th","द":"d","ध":"dh","न":"n",
  "प":"p","फ":"f","ब":"b","भ":"bh","म":"m",
  "य":"y","र":"r","ल":"l","व":"v","श":"sh",
  "ष":"sh","स":"s","ह":"h",
  "क्ष":"ksh","त्र":"tr","ज्ञ":"gya","श्र":"shr",
  // Nukta variants (Urdu-origin sounds)
  "क़":"q","ख़":"kh","ग़":"gh","ज़":"z","ड़":"r","ढ़":"rh","फ़":"f","य़":"y",
};

/** Convert Devanagari text to phonetic Roman (Hinglish) */
function devanagariToRoman(text) {
  let result = "";
  let i      = 0;

  while (i < text.length) {
    const ch = text[i];
    const cp = ch.codePointAt(0);

    // Non-Devanagari character (Latin, numbers, punctuation, spaces) — pass through
    if (cp < 0x0900 || cp > 0x097F) {
      result += ch;
      i++;
      continue;
    }

    // Check multi-char consonant clusters first (क्ष, त्र, ज्ञ, श्र)
    let matched = false;
    for (const [dev, rom] of Object.entries(CONSONANTS)) {
      if (dev.length > 1 && text.startsWith(dev, i)) {
        result += rom;
        i += dev.length;
        // Look ahead for vowel sign
        if (i < text.length && VOWEL_SIGNS[text[i]] !== undefined) {
          result += VOWEL_SIGNS[text[i]] || "";
          i++;
        } else {
          result += "a"; // inherent 'a'
        }
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Vowel (standalone)
    if (VOWELS[ch]) {
      result += VOWELS[ch];
      i++;
      continue;
    }

    // Consonant
    if (CONSONANTS[ch]) {
      result += CONSONANTS[ch];
      i++;
      if (i < text.length && VOWEL_SIGNS[text[i]] !== undefined) {
        // Explicit vowel sign (including halant ् which maps to "")
        result += VOWEL_SIGNS[text[i]];
        i++;
      } else if (i < text.length) {
        const nextCp = text[i].codePointAt(0);
        const isNextDevanagari = nextCp >= 0x0900 && nextCp <= 0x097F;
        const isNextConsonant  = nextCp >= 0x0915 && nextCp <= 0x0939;
        if (isNextDevanagari && !isNextConsonant) {
          // Next is a vowel or matra — it will handle itself, no inherent 'a'
        } else if (isNextConsonant) {
          // Consonant cluster — add inherent 'a' between them
          result += "a";
        }
        // Non-Devanagari next (space, punctuation, Latin) → no inherent 'a' (word ends here)
      }
      // End of string → no trailing 'a'
      continue;
    }

    // Vowel sign appearing without preceding consonant (shouldn't happen, but be safe)
    if (VOWEL_SIGNS[ch] !== undefined) {
      result += VOWEL_SIGNS[ch];
      i++;
      continue;
    }

    // Anything else — keep as is
    result += ch;
    i++;
  }

  return result.replace(/aa(?=[^aeiou\s])/g, "a"); // simplify double-a in clusters
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function chunkText(text, size = CHUNK_CHARS) {
  if (text.length <= size) return [text];
  const chunks = [];
  let start    = 0;
  while (start < text.length) {
    let end = start + size;
    if (end < text.length) {
      // Break at sentence end or space
      const sentEnd = Math.max(
        text.lastIndexOf(". ", end),
        text.lastIndexOf("? ", end),
        text.lastIndexOf("! ", end)
      );
      if (sentEnd > start + 50) end = sentEnd + 2;
      else {
        const spaceEnd = text.lastIndexOf(" ", end);
        if (spaceEnd > start + 50) end = spaceEnd + 1;
      }
    }
    chunks.push(text.slice(start, end).trim());
    start = end;
  }
  return chunks.filter(Boolean);
}

function extractYouTubeId(url = "") {
  if (!url) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
  const regex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const m = url.match(regex);
  return m ? m[1] : null;
}
