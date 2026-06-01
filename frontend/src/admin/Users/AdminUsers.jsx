import React, { useEffect, useState } from "react";
import "./users.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { server } from "../../main";
import Layout from "../Utils/Layout";
import toast from "react-hot-toast";

const AdminUsers = ({ user }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [filterRole, setFilterRole] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [courseToRevoke, setCourseToRevoke] = useState(null);

  useEffect(() => {
    if (user && user.role !== "admin" && user.mainrole !== "superadmin") {
      navigate("/");
    }
  }, [user, navigate]);

  async function fetchUsers() {
    try {
      const { data } = await axios.get(`${server}/api/users`, {
        headers: {
          token: localStorage.getItem("token"),
        },
      });

      setUsers(data.users);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    if (!user) return;
    fetchUsers();
  }, [user]);

  if (!user) return null;

  const filteredUsers = users.filter((u) => {
    if (filterRole === "all") return true;
    return u.role === filterRole;
  });

  const openInfo = (user) => {
    setSelectedUser(user);
    setShowInfo(true);
  };

  const closeInfo = () => {
    setSelectedUser(null);
    setShowInfo(false);
    setCourseToRevoke(null);
    setShowConfirm(false);
  };

  const openConfirm = (course) => {
    setCourseToRevoke(course);
    setShowConfirm(true);
  };

  const closeConfirm = () => {
    setCourseToRevoke(null);
    setShowConfirm(false);
  };

  const handleRoleUpdate = async (id) => {
    if (!window.confirm("Are you sure you want to update this user role?")) return;

    try {
      const { data } = await axios.put(
        `${server}/api/user/${id}`,
        {},
        {
          headers: {
            token: localStorage.getItem("token"),
          },
        }
      );

      toast.success(data.message);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update role");
    }
  };

  const handleRevoke = async () => {
    if (!selectedUser || !courseToRevoke) return;

    try {
      const { data } = await axios.delete(
        `${server}/api/user/${selectedUser._id}/course/${courseToRevoke._id}`,
        {
          headers: {
            token: localStorage.getItem("token"),
          },
        }
      );

      toast.success(data.message);
      closeConfirm();
      fetchUsers();
      setSelectedUser((prev) => ({
        ...prev,
        subscription: prev.subscription?.filter((course) => course._id !== courseToRevoke._id) || [],
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to revoke access");
    }
  };

  return (
    <Layout>
      <div className="users">
        <div className="users-header">
          <div>
            <h1>All Users</h1>
            <p className="users-subtitle">Manage accounts and revoke course access.</p>
          </div>
          <div className="users-filter">
            <label htmlFor="filter-role">Filter by role:</label>
            <select
              id="filter-role"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="all">All</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <table className="users-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Enrolled</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((e, i) => (
              <tr key={e._id}>
                <td>{i + 1}</td>
                <td>{e.name}</td>
                <td>{e.email}</td>
                <td>
                  <span className={`role-pill role-${e.role}`}>
                    {e.role}
                  </span>
                </td>
                <td>{e.subscription?.length || 0}</td>
                <td className="action-buttons">
                  <button className="common-btn info-btn" onClick={() => openInfo(e)}>
                    Info
                  </button>
                  <button
                    onClick={() => handleRoleUpdate(e._id)}
                    className="common-btn"
                    disabled={user._id === e._id || e.mainrole === "superadmin"}
                  >
                    {e.role === "admin" ? "Demote" : "Promote"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {showInfo && selectedUser && (
          <div className="info-modal">
            <div className="info-card">
              <div className="info-card-header">
                <div>
                  <h2>{selectedUser.name}</h2>
                  <p>{selectedUser.email}</p>
                </div>
                <button className="close-btn" onClick={closeInfo}>
                  Close
                </button>
              </div>

              <h3>Enrolled Courses ({selectedUser.subscription?.length || 0})</h3>
              {selectedUser.subscription?.length > 0 ? (
                <ul className="course-list">
                  {selectedUser.subscription.map((course) => (
                    <li key={course._id}>
                      <div className="course-item-details">
                        <strong>{course.title}</strong>
                        <p>{course.category || "No category"}</p>
                      </div>
                      <button className="common-btn revoke-btn" onClick={() => openConfirm(course)}>
                        Revoke
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-courses">This user has no enrolled courses.</p>
              )}
            </div>
          </div>
        )}

        {showConfirm && courseToRevoke && (
          <div className="confirm-modal">
            <div className="confirm-card">
              <h2>Revoke Access</h2>
              <p>
                Revoke <strong>{courseToRevoke.title}</strong> access from <strong>{selectedUser.name}</strong>?
              </p>
              <div className="confirm-actions">
                <button className="common-btn cancel-btn" onClick={closeConfirm}>
                  Cancel
                </button>
                <button className="common-btn" onClick={handleRevoke}>
                  Revoke
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminUsers;
