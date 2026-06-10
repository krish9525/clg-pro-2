import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { verifyCert } from "../../api/courseApi";
import Loading from "../../components/loading/Loading";
import "./verify.css";

const VerifyCertificate = () => {
  const { certId } = useParams();
  const [info,    setInfo]    = useState(null);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await verifyCert(certId);
        setInfo(data.data);
      } catch (e) {
        setError(e.response?.data?.message || "Certificate not found or invalid.");
      } finally {
        setLoading(false);
      }
    };
    if (certId) check();
  }, [certId]);

  if (loading) return <Loading />;

  return (
    <div className="verify-page">
      <div className="verify-card">
        {error ? (
          <>
            <div className="verify-icon invalid">❌</div>
            <h2 className="verify-title invalid">Invalid Certificate</h2>
            <p className="verify-sub">{error}</p>
            <p className="verify-id">ID: <code>{certId}</code></p>
          </>
        ) : (
          <>
            <div className="verify-icon valid">✅</div>
            <h2 className="verify-title valid">Certificate Verified!</h2>
            <p className="verify-sub">This is an authentic EduLearn certificate.</p>

            <div className="verify-details">
              <div className="verify-row">
                <span className="verify-label">👤 Student</span>
                <span className="verify-value">{info.studentName}</span>
              </div>
              <div className="verify-row">
                <span className="verify-label">📚 Course</span>
                <span className="verify-value">{info.courseTitle}</span>
              </div>
              <div className="verify-row">
                <span className="verify-label">👨‍🏫 Instructor</span>
                <span className="verify-value">{info.instructor}</span>
              </div>
              <div className="verify-row">
                <span className="verify-label">📅 Completed</span>
                <span className="verify-value">
                  {new Date(info.completionDate).toLocaleDateString("en-IN", {
                    day: "2-digit", month: "long", year: "numeric",
                  })}
                </span>
              </div>
              <div className="verify-row">
                <span className="verify-label">🔑 Certificate ID</span>
                <span className="verify-value"><code>{info.certificateId}</code></span>
              </div>
            </div>
          </>
        )}

        <Link to="/" className="verify-home-btn">← Back to EduLearn</Link>
      </div>
    </div>
  );
};

export default VerifyCertificate;
