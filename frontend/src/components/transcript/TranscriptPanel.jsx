import React, { useState } from "react";
import { getTranscript } from "../../api/courseApi.js";
import { refreshTranscript } from "../../api/adminApi.js";
import toast from "react-hot-toast";
import "./transcript.css";

const TranscriptPanel = ({ lectureId, isAdmin }) => {
  const [open,       setOpen]       = useState(false);
  const [transcript, setTranscript] = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  const load = async () => {
    if (transcript !== null) return; // already fetched
    setLoading(true); setError("");
    try {
      const { data } = await getTranscript(lectureId);
      setTranscript(data.data.transcript || "");
      if (!data.data.transcript) setError(data.data.error || "No transcript available for this video.");
    } catch {
      setError("Failed to fetch transcript.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) load();
  };

  const handleRefresh = async () => {
    setLoading(true); setError(""); setTranscript(null);
    try {
      const { data } = await refreshTranscript(lectureId);
      setTranscript(data.data.transcript || "");
      if (!data.data.transcript) setError(data.data.error || "No transcript available.");
      else toast.success("Transcript refreshed!");
    } catch {
      setError("Refresh failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tp-wrap">
      <button className="tp-toggle" onClick={handleToggle}>
        {open ? "▲ Hide Transcript" : "▼ Show Transcript"}
      </button>

      {open && (
        <div className="tp-body">
          {loading && <p className="tp-loading">Fetching transcript…</p>}

          {!loading && error && (
            <p className="tp-error">ℹ️ {error}</p>
          )}

          {!loading && !error && transcript && (
            <>
              {isAdmin && (
                <button className="tp-refresh" onClick={handleRefresh}>🔄 Refresh</button>
              )}
              <div className="tp-text">{transcript}</div>
            </>
          )}

          {!loading && !error && transcript === "" && !error && (
            <p className="tp-error">ℹ️ No transcript available for this video.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TranscriptPanel;
