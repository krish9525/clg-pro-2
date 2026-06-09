import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getCertStatus, downloadCert } from "../../api/courseApi.js";
import "./certificate.css";

const CertificateButton = ({ courseId, progress }) => {
  const [status,      setStatus]      = useState(null); // { earned, certId, earnedAt }
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { if (courseId) loadStatus(); }, [courseId]);

  const loadStatus = async () => {
    try {
      const { data } = await getCertStatus(courseId);
      setStatus(data.data);
    } catch { /* silent — user may not be enrolled yet */ }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { data } = await downloadCert(courseId);
      // Trigger browser download
      const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      const a   = document.createElement("a");
      a.href     = url;
      a.download = `certificate-${courseId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Certificate downloaded! 🎓");
    } catch (err) {
      const msg = err.response?.data?.message || "Download failed";
      toast.error(msg);
    } finally {
      setDownloading(false);
    }
  };

  // Not loaded yet or not earned
  if (!status) return null;

  const pct = progress?.courseProgressPercentage ?? 0;

  if (!status.earned) {
    return (
      <div className="cert-locked">
        <span className="cert-lock-icon">🔒</span>
        <div>
          <p className="cert-lock-title">Certificate Locked</p>
          <p className="cert-lock-sub">Complete all lectures to earn your certificate ({pct}% done)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cert-earned">
      <div className="cert-badge">
        <span className="cert-trophy">🏆</span>
        <div>
          <p className="cert-earned-title">Course Completed!</p>
          <p className="cert-earned-sub">
            Certificate ID: <code>{status.certId}</code>
          </p>
          {status.earnedAt && (
            <p className="cert-earned-date">
              Earned on {new Date(status.earnedAt).toLocaleDateString("en-IN", {
                day: "2-digit", month: "long", year: "numeric"
              })}
            </p>
          )}
        </div>
      </div>
      <button
        className="cert-dl-btn"
        onClick={handleDownload}
        disabled={downloading}
      >
        {downloading ? "Generating…" : "⬇ Download Certificate"}
      </button>
    </div>
  );
};

export default CertificateButton;
