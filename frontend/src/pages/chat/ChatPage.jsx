import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { server } from "../../main";
import { UserContext } from "../../context/UserContext";
import Chat from "../../components/chat/Chat";
import "../../components/chat/chat.css";

const ChatPage = () => {
  const { user } = useContext(UserContext);
  const [admin, setAdmin] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        if (isAdmin) {
          const { data } = await axios.get(
            `${server}/api/chat/conversations/list`,
            { headers: { token: localStorage.getItem("token") } }
          );
          setConversations(data.conversations || []);
          if (data.conversations?.length) {
            setSelectedUser(data.conversations[0].user);
          }
        } else {
          const { data } = await axios.get(`${server}/api/user/admin`, {
            headers: { token: localStorage.getItem("token") },
          });
          setAdmin(data.admin);
          setSelectedUser(data.admin);
        }
      } catch (err) {
        setError("Unable to load chat. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user?._id) load();
  }, [user?._id, isAdmin]);

  if (error) {
    return (
      <div className="chat-error-state">
        ⚠️ {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="chat-loading-state">
        <span className="chat-spinner">⏳</span>
        Loading chat...
      </div>
    );
  }

  const activePartner = selectedUser || admin;
  const partnerName = activePartner?.name || (isAdmin ? "Select a user" : "Support");

  return (
    <div className="chat-page-wrapper">
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <h2>💬 Messages</h2>
          <p>{isAdmin ? "All student chats" : "Chat with support"}</p>
        </div>

        {isAdmin ? (
          <div className="contacts-list">
            {conversations.length === 0 && (
              <p className="no-contacts">No conversations yet.</p>
            )}
            {conversations.map(({ user: contact, lastMessage, lastMessageAt }) => (
              <button
                key={contact._id}
                type="button"
                className={`contact-item ${
                  selectedUser?._id === contact._id ? "active" : ""
                }`}
                onClick={() => setSelectedUser(contact)}
              >
                <div className="contact-avatar">
                  {contact.name?.charAt(0)?.toUpperCase() || "?"}
                  <div className="online-dot" />
                </div>
                <div className="contact-info">
                  <div className="contact-name">{contact.name}</div>
                  <div className="contact-preview">{lastMessage}</div>
                  <div className="contact-time">
                    {new Date(lastMessageAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="contact-item active">
            <div className="contact-avatar">
              {admin?.name?.charAt(0)?.toUpperCase() || "🎓"}
              <div className="online-dot" />
            </div>
            <div className="contact-info">
              <div className="contact-name">{admin?.name || "Admin"}</div>
              <div className="contact-status">Support team</div>
            </div>
          </div>
        )}

        <div className="sidebar-tip">
          💡 Send text, images 📷, and react with 😀 on any message. History is saved in the database.
        </div>
      </div>

      {activePartner?._id ? (
        <Chat
          key={activePartner._id}
          receiverId={activePartner._id}
          receiverName={partnerName}
        />
      ) : (
        <div className="chat-empty-panel">
          <p>Select a conversation from the left to start chatting.</p>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
