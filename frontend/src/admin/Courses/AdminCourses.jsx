import React, { useEffect, useState } from "react";
import Layout from "../Utils/Layout";
import { useNavigate } from "react-router-dom";
import { CourseData } from "../../context/CourseContext";
import CourseCard from "../../components/coursecard/CourseCard";
import "./admincourses.css";
import toast from "react-hot-toast";
import axios from "axios";
import { server } from "../../main";

const categories = [
  "Web Development",
  "App Development",
  "Game Development",
  "Data Science",
  "Artificial Intelligence",
  "UI/UX Design",
  "Cybersecurity",
  "DevOps",
];

const AdminCourses = ({ user }) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [duration, setDuration] = useState("");
  const [image, setImage] = useState("");
  const [imagePrev, setImagePrev] = useState("");
  const [btnLoading, setBtnLoading] = useState(false);

  const { courses, fetchCourses } = CourseData();

  useEffect(() => {
    if (user && user.role !== "admin" && user.mainrole !== "superadmin") {
      navigate("/");
    }
  }, [user, navigate]);

  if (!user) return null;

  const changeImageHandler = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setImagePrev(reader.result);
      setImage(file);
    };
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    setBtnLoading(true);
    const myForm = new FormData();
    myForm.append("title", title);
    myForm.append("description", description);
    myForm.append("category", category);
    myForm.append("price", price);
    myForm.append("createdBy", createdBy);
    myForm.append("duration", duration);
    myForm.append("file", image);
    try {
      const { data } = await axios.post(`${server}/api/course/new`, myForm, {
        headers: { token: localStorage.getItem("token") },
      });
      toast.success(data.message);
      await fetchCourses();
      // reset
      setImage(""); setTitle(""); setDescription("");
      setDuration(""); setImagePrev(""); setCreatedBy("");
      setPrice(""); setCategory("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Error creating course");
    } finally {
      setBtnLoading(false);
    }
  };

  return (
    <Layout>
      <div className="admin-courses">
        {/* ===== LEFT: Course list ===== */}
        <div className="left">
          <h1>📚 All Courses</h1>
          <p className="courses-count">
            {courses?.length || 0} course{courses?.length !== 1 ? "s" : ""} published
          </p>
          <div className="dashboard-content">
            {courses && courses.length > 0 ? (
              courses.map((e) => <CourseCard key={e._id} course={e} />)
            ) : (
              <p className="no-courses-msg">
                🎓 No courses yet — add your first course!
              </p>
            )}
          </div>
        </div>

        {/* ===== RIGHT: Add Course Form ===== */}
        <div className="right">
          <div className="course-form-card">
            <h2>➕ Add New Course</h2>
            <p className="form-subtitle">Fill in the details to publish a new course</p>

            <form className="course-form" onSubmit={submitHandler}>
              <label>Course Title</label>
              <input
                type="text"
                placeholder="e.g. Complete React Development"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <label>Description</label>
              <input
                type="text"
                placeholder="Brief course description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />

              <label>Instructor Name</label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                required
              />

              <label>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <div className="price-row">
                <div>
                  <label>Price (₹)</label>
                  <input
                    type="number"
                    placeholder="499"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label>Duration (weeks)</label>
                  <input
                    type="number"
                    placeholder="8"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    required
                    min="1"
                  />
                </div>
              </div>

              <label>Course Thumbnail</label>
              {imagePrev ? (
                <>
                  <img src={imagePrev} alt="preview" className="img-preview" />
                  <button
                    type="button"
                    className="common-btn"
                    style={{ marginTop: 0, marginBottom: 14, background: "var(--bg-section)", color: "var(--text-secondary)", boxShadow: "none", border: "2px solid var(--border-light)", fontSize: 13, padding: "8px 16px" }}
                    onClick={() => { setImage(""); setImagePrev(""); }}
                  >
                    ✕ Remove Image
                  </button>
                </>
              ) : (
                <div className="file-upload-area">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={changeImageHandler}
                    required
                  />
                  <span className="upload-icon">🖼️</span>
                  <span className="upload-text">Click to upload thumbnail<br /><small>PNG, JPG, WEBP (max 5MB)</small></span>
                </div>
              )}

              <button type="submit" disabled={btnLoading} className="common-btn">
                {btnLoading ? "⏳ Creating..." : "🚀 Create Course"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminCourses;
