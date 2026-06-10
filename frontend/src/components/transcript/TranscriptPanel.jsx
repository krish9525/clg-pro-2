import React, { useState, useRef } from "react";
import { getTranscript } from "../../api/courseApi.js";
import { refreshTranscript } from "../../api/adminApi.js";
import toast from "react-hot-toast";
import "./transcript.css";

const LANGS = [
  { key: "en",       label: "🇬🇧 English",  title: "Original transcript" },
  { key: "hi",       label: "🇮🇳 हिंदी",    title: "Hindi (Devanagari script)" },
  { key: "hinglish", label: "🔤 Hinglish",  title: "Hindi in Roman script (Hinglish)" },
];

const LOADING_MSG = {
  en:       "Fetching transcript…",
  hi:       "Hindi mein anuvad ho raha hai… 🇮🇳",
  hinglish: "Hinglish mein translate ho raha hai… 🔤",
};

const TranscriptPanel = ({ lectureId, isAdmin }) => {
  const [open,    setOpen]    = useState(false);
  const [lang,    setLang]    = useState("en");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // Per-lang cache so switching tabs is instant (no refetch)
  const cache         = useRef({});
  const prevLectureId = useRef(null);

  // Reset cache when lecture changes
  if (prevLectureId.current !== lectureId) {
    cache.current    = {};
    prevLectureId.current = lectureId;
  }

  const loadLang = async (targetLang) => {
    if (cache.current[targetLang] !== undefined) return; // already cached
    setLoading(true);
    setError("");
    try {
      const { data } = await getTranscript(lectureId, targetLang);
      const text = data.data?.transcript ?? "";
      cache.current[targetLang] = text;
      if (!text) setError(data.data?.error || "No transcript available for this video.");
    } catch {
      cache.current[targetLang] = "";
      setError("Failed to fetch transcript. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadLang(lang);
  };

  const handleLangSwitch = (newLang) => {
    if (newLang === lang) return;
    setLang(newLang);
    setError("");
    loadLang(newLang);
  };

  const handleRefresh = async () => {
    setLoading(true);
    setError("");
    cache.current = {}; // clear all language caches
    try {
      await refreshTranscript(lectureId);
      toast.success("Transcript refreshed — all languages cleared.");
      await loadLang(lang);
    } catch {
      setError("Refresh failed.");
      setLoading(false);
    }
  };

  const currentText = cache.current[lang];

  return (
    <div className="tp-wrap">
      <button className="tp-toggle" onClick={handleToggle}>
        {open ? "▲ Hide Transcript" : "▼ Show Transcript"}
      </button>

      {open && (
        <div className="tp-body">
          {/* ── Language selector tabs ── */}
          <div className="tp-lang-tabs">
            {LANGS.map(({ key, label, title }) => (
              <button
                key={key}
                className={`tp-lang-btn ${lang === key ? "active" : ""}`}
                onClick={() => handleLangSwitch(key)}
                title={title}
                disabled={loading}
              >
                {label}
              </button>
            ))}
            {isAdmin && (
              <button
                className="tp-refresh"
                onClick={handleRefresh}
                disabled={loading}
                title="Re-fetch from YouTube and clear all cached translations"
              >
                🔄 Refresh
              </button>
            )}
          </div>

          {/* ── Content area ── */}
          {loading && (
            <div className="tp-loading">
              <span className="tp-spinner" />
              {LOADING_MSG[lang]}
            </div>
          )}

          {!loading && error && (
            <p className="tp-error">ℹ️ {error}</p>
          )}

          {!loading && !error && currentText && (
            <div className={`tp-text ${lang === "hi" ? "tp-devanagari" : ""}`}>
              {currentText}
            </div>
          )}

          {!loading && !error && currentText === "" && (
            <p className="tp-error">ℹ️ No transcript available for this video.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TranscriptPanel;
