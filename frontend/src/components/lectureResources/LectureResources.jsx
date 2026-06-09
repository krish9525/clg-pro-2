/**
 * Shows downloadable files for a lecture.
 * Admin sees upload panel + delete button.
 * Students only see download links.
 */
import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { getResources } from "../../api/courseApi.js";
import { uploadResource, deleteResource } from "../../api/adminApi.js";
import "./lectureResources.css";

const FILE_ICONS = {
  pdf:  "📄",
  doc:  "📝",
  docx: "📝",
  ppt:  "📊",
  pptx: "📊",
  txt:  "📃",
  zip:  "🗜️",
};

const formatSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const LectureResources = ({ lectureId, isAdmin }) => {
  const [resources,  setResources]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [uploading,  setUploading]  = useState(false);
  const [customName, setCustomName] = useState("");
  const fileRef = useRef();

  useEffect(() => { if (lectureId) load(); }, [lectureId]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getResources(lectureId);
      setResources(data.data.resources || []);
    } catch { setResources([]); }
    finally { setLoading(false); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    if (customName.trim()) fd.append("name", customName.trim());

    setUploading(true);
    try {
      await uploadResource(lectureId, fd);
      toast.success("File uploaded!");
      setCustomName("");
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (resourceId) => {
    if (!confirm("Delete this resource?")) return;
    try {
      await deleteResource(lectureId, resourceId);
      setResources(r => r.filter(x => x._id !== resourceId));
      toast.success("Resource deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  if (loading) return <div className="lr-loading">Loading resources…</div>;

  return (
    <div className="lr-wrap">
      <h4 className="lr-title">📎 Lecture Resources</h4>

      {/* Admin upload section */}
      {isAdmin && (
        <div className="lr-upload">
          <input
            className="lr-name-input"
            placeholder="Custom file name (optional)"
            value={customName}
            onChange={e => setCustomName(e.target.value)}
          />
          <label className={`lr-upload-btn ${uploading ? "uploading" : ""}`}>
            {uploading ? "Uploading…" : "📤 Upload File"}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip"
              hidden
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
          <p className="lr-hint">Supports PDF, DOC, DOCX, PPT, PPTX, TXT, ZIP · Max 20MB</p>
        </div>
      )}

      {/* Resource list */}
      {resources.length === 0 ? (
        <p className="lr-empty">
          {isAdmin ? "No resources yet. Upload files for students to download." : "No resources available for this lecture."}
        </p>
      ) : (
        <div className="lr-list">
          {resources.map(r => (
            <div key={r._id} className="lr-item">
              <span className="lr-icon">{FILE_ICONS[r.fileType] || "📁"}</span>
              <div className="lr-info">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="lr-name"
                >
                  {r.name}
                </a>
                <span className="lr-meta">
                  {r.fileType?.toUpperCase()} {r.size ? `· ${formatSize(r.size)}` : ""}
                </span>
              </div>
              <div className="lr-actions">
                <a href={r.url} target="_blank" rel="noopener noreferrer" download className="lr-dl-btn">
                  ⬇ Download
                </a>
                {isAdmin && (
                  <button className="lr-del-btn" onClick={() => handleDelete(r._id)}>🗑</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LectureResources;
