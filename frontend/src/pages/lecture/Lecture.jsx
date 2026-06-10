import React, { useEffect, useState, useCallback } from "react";
import "./lecture.css";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { server } from "../../main";
import Loading from "../../components/loading/Loading";
import toast from "react-hot-toast";
import { TiTick } from "react-icons/ti";
import QuizPlayer from "../../components/quiz/QuizPlayer";
import QuizBuilder from "../../components/quiz/QuizBuilder";
import LectureResources from "../../components/lectureResources/LectureResources";
import TranscriptPanel from "../../components/transcript/TranscriptPanel";

// Extract YouTube video ID from any URL format
const getYouTubeId = (url = "") => {
  if (!url) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
  const regex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

const YouTubePlayer = ({ videoId, onEnded }) => (
  <div className="yt-wrapper">
    <iframe
      key={videoId}
      src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&color=white`}
      title="Lecture Video"
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      className="yt-iframe"
      onEnded={onEnded}
    />
  </div>
);

const Lecture = ({ user }) => {
  const [lectures, setLectures]     = useState([]);
  const [lecture, setLecture]       = useState({});
  const [loading, setLoading]       = useState(true);
  const [lecLoading, setLecLoading] = useState(false);
  const [show, setShow]             = useState(false);

  // Form state
  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [urlPreviewId, setUrlPreviewId] = useState("");
  const [btnLoading, setBtnLoading] = useState(false);

  // Progress state
  const [completed, setCompleted]       = useState(0);
  const [completedLec, setCompletedLec] = useState(0);
  const [lectLength, setLectLength]     = useState(0);
  const [progress, setProgress]         = useState([]);

  // Feature panels
  const [showQuiz, setShowQuiz]             = useState(false);
  const [showQuizBuilder, setShowQuizBuilder] = useState(false);

  const params   = useParams();
  const navigate = useNavigate();

  const isAdmin = user?.role === "admin";
  const token   = localStorage.getItem("token");
  const headers = { headers: { token } };

  // ─── ALL hooks before any conditional return ───────────────────────────────
  useEffect(() => {
    if (user && !isAdmin && !user.subscription?.includes(params.id)) {
      navigate("/");
    }
  }, [user, navigate, params.id, isAdmin]);

  const fetchLectures = useCallback(async () => {
    try {
      const { data } = await axios.get(`${server}/api/lectures/${params.id}`, headers);
      setLectures(data.lectures || []);
    } catch {
      /* silent */
    }
  }, [params.id]);

  const fetchProgress = useCallback(async () => {
    try {
      const { data } = await axios.get(
        `${server}/api/user/progress?course=${params.id}`, headers
      );
      setCompleted(data.courseProgressPercentage || 0);
      setCompletedLec(data.completedLectures || 0);
      setLectLength(data.allLectures || 0);
      setProgress(data.progress || []);
    } catch { /* silent */ }
  }, [params.id]);

  useEffect(() => {
    const init = async () => {
      await fetchLectures();
      if (!isAdmin) await fetchProgress();
      setLoading(false);
    };
    init();
  }, [fetchLectures, fetchProgress, isAdmin]);

  // Reset panels when switching lectures
  useEffect(() => {
    setShowQuiz(false);
    setShowQuizBuilder(false);
  }, [lecture._id]);

  // ─── Early returns (after all hooks) ──────────────────────────────────────
  if (!user) return null;

  const fetchLecture = async (id) => {
    setLecLoading(true);
    try {
      const { data } = await axios.get(`${server}/api/lecture/${id}`, headers);
      setLecture(data.lecture);
    } finally {
      setLecLoading(false);
    }
  };

  const addProgress = async (id) => {
    try {
      await axios.post(
        `${server}/api/user/progress?course=${params.id}&lectureId=${id}`,
        {}, headers
      );
      fetchProgress();
    } catch { /* silent */ }
  };

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setYoutubeUrl(val);
    const id = getYouTubeId(val);
    setUrlPreviewId(id || "");
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    const id = getYouTubeId(youtubeUrl);
    if (!id) {
      toast.error("Invalid YouTube URL! Please paste a valid YouTube link.");
      return;
    }
    setBtnLoading(true);
    try {
      const { data } = await axios.post(
        `${server}/api/course/${params.id}`,
        { title, description, youtubeUrl },
        headers
      );
      toast.success(data.message);
      setShow(false);
      setTitle(""); setDescription(""); setYoutubeUrl(""); setUrlPreviewId("");
      fetchLectures();
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setBtnLoading(false);
    }
  };

  const deleteHandler = async (id) => {
    if (confirm("Are you sure you want to delete this lecture?")) {
      try {
        const { data } = await axios.delete(`${server}/api/lecture/${id}`, headers);
        toast.success(data.message);
        fetchLectures();
        setLecture({});
      } catch (error) {
        toast.error(error.response?.data?.message);
      }
    }
  };

  const videoId = lecture.video ? getYouTubeId(lecture.video) : null;
  const hasLecture = !!lecture._id;

  if (loading) return <Loading />;

  return (
    <div className="lecture-page-wrapper">
      {/* Progress bar */}
      {!isAdmin && (
        <div className="progress-bar-section">
          <div className="progress-info">
            <span>📚 Progress: <strong>{completedLec}</strong> / {lectLength} lectures</span>
            <span className="progress-pct">{Math.round(completed)}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${completed}%` }} />
          </div>
        </div>
      )}

      <div className="lecture-page">
        {/* ===== LEFT: Video + Features ===== */}
        <div className="left">
          {lecLoading ? (
            <div className="lec-loading"><Loading /></div>
          ) : videoId ? (
            <>
              <YouTubePlayer
                videoId={videoId}
                onEnded={() => addProgress(lecture._id)}
              />
              <div className="lecture-info">
                <h1>{lecture.title}</h1>
                <p>{lecture.description}</p>
              </div>

              {/* ─── Feature tabs ─────────────────────────────────────── */}
              <div className="lecture-features">

                {/* Transcript */}
                <TranscriptPanel lectureId={lecture._id} isAdmin={isAdmin} />

                {/* Resources / Materials */}
                <LectureResources lectureId={lecture._id} isAdmin={isAdmin} />

                {/* Quiz ─ student */}
                {!isAdmin && (
                  <div className="feature-section">
                    <button
                      className="feature-toggle-btn"
                      onClick={() => setShowQuiz((p) => !p)}
                    >
                      📝 {showQuiz ? "Hide Quiz" : "Take Lecture Quiz"}
                    </button>
                    {showQuiz && (
                      <QuizPlayer
                        lectureId={lecture._id}
                        onClose={() => setShowQuiz(false)}
                      />
                    )}
                  </div>
                )}

                {/* Quiz Builder ─ admin */}
                {isAdmin && (
                  <div className="feature-section">
                    <button
                      className="feature-toggle-btn admin-quiz-btn"
                      onClick={() => setShowQuizBuilder((p) => !p)}
                    >
                      🛠 {showQuizBuilder ? "Close Quiz Builder" : "Manage Quiz for this Lecture"}
                    </button>
                    {showQuizBuilder && (
                      <QuizBuilder
                        lectureId={lecture._id}
                        onClose={() => setShowQuizBuilder(false)}
                      />
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-lecture-selected">
              <div className="no-lec-icon">▶️</div>
              <h2>Select a lecture to start watching</h2>
              <p>Choose any lecture from the list on the right</p>
            </div>
          )}
        </div>

        {/* ===== RIGHT: Sidebar ===== */}
        <div className="right">
          {/* Admin: Add Lecture button */}
          {isAdmin && (
            <button
              className="common-btn add-lec-btn"
              onClick={() => setShow(!show)}
            >
              {show ? "✕ Close Form" : "+ Add Lecture"}
            </button>
          )}

          {/* Add Lecture Form */}
          {show && (
            <div className="lecture-form">
              <h2>📹 Add New Lecture</h2>
              <p className="form-hint">
                Upload video to YouTube as <strong>Unlisted</strong>, then paste the link below.
              </p>
              <form onSubmit={submitHandler}>
                <label>Lecture Title</label>
                <input
                  type="text"
                  placeholder="e.g. Introduction to React"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <label>Description</label>
                <input
                  type="text"
                  placeholder="Brief description of this lecture"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
                <label>YouTube Video URL</label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={handleUrlChange}
                  required
                />
                {urlPreviewId && (
                  <div className="yt-preview">
                    <p className="preview-label">✅ Preview:</p>
                    <YouTubePlayer videoId={urlPreviewId} />
                  </div>
                )}
                {youtubeUrl && !urlPreviewId && (
                  <p className="url-error">❌ Invalid YouTube URL</p>
                )}
                <button disabled={btnLoading} type="submit" className="common-btn">
                  {btnLoading ? "Adding..." : "Add Lecture"}
                </button>
              </form>
            </div>
          )}

          {/* Lecture List */}
          <div className="lecture-list">
            <h3 className="list-title">📋 Lectures ({lectures.length})</h3>
            {lectures.length > 0 ? (
              lectures.map((e, i) => {
                const isCompleted = progress[0]?.completedLectures?.includes(e._id);
                const isActive    = lecture._id === e._id;
                return (
                  <div key={e._id} className="lecture-item-wrapper">
                    <div
                      onClick={() => fetchLecture(e._id)}
                      className={`lecture-number ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
                    >
                      <span className="lec-num">{i + 1}</span>
                      <span className="lec-title">{e.title}</span>
                      {isCompleted && (
                        <span className="tick-badge"><TiTick /></span>
                      )}
                    </div>
                    {isAdmin && (
                      <button
                        className="delete-lec-btn"
                        onClick={() => deleteHandler(e._id)}
                      >
                        🗑
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="no-lec-msg">No lectures added yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lecture;
