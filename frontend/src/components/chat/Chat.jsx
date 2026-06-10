import { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { UserContext } from '../../context/UserContext';
import io from 'socket.io-client';
import axios from 'axios';
import { server } from '../../main';
import './chat.css';

const EMOJIS = ['😊', '😂', '👍', '❤️', '🔥', '🎉', '😎', '🤔', '👏', '💯'];
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

// Colour palette — one per user, hash by ID
const USER_COLORS = ['#8a4baf','#667eea','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#14b8a6'];
const userColor = (id = '') => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return USER_COLORS[h % USER_COLORS.length];
};

const getId = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'object' && val._id) return String(val._id).trim();
  return String(val).trim();
};

const upsertMessage = (list, incoming) => {
  const id = getId(incoming._id);
  if (!id) return [...list, incoming];
  const idx = list.findIndex((m) => getId(m._id) === id);
  if (idx === -1) return [...list, incoming];
  const next = [...list];
  next[idx] = incoming;
  return next;
};

const Chat = ({ receiverId, receiverName = 'User' }) => {
  const { user } = useContext(UserContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Map());
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeReactionMsg, setActiveReactionMsg] = useState(null);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const isSendingRef = useRef(false);

  const myId = getId(user?._id);        // always a plain string
  const partnerId = getId(receiverId);

  const authHeaders = useCallback(
    () => ({ headers: { token: localStorage.getItem('token') } }),
    []
  );

  const mergeMessages = useCallback((incoming) => {
    setMessages((prev) => upsertMessage(prev, incoming));
  }, []);

  useEffect(() => {
    if (!myId) return;

    const socket = io(server, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.emit('join', myId);

    socket.on('chat:message', mergeMessages);
    socket.on('chat:reaction', mergeMessages);
    socket.on('typing', ({ sender, senderName }) => {
      if (getId(sender) !== partnerId) return;
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.set(getId(sender), senderName || 'Someone');
        return next;
      });
    });
    socket.on('stopTyping', ({ sender }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.delete(getId(sender));
        return next;
      });
    });

    return () => {
      socket.off('chat:message');
      socket.off('chat:reaction');
      socket.off('typing');
      socket.off('stopTyping');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [myId, partnerId, mergeMessages]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!partnerId) return;
      try {
        const { data } = await axios.get(
          `${server}/api/chat/${partnerId}`,
          authHeaders()
        );
        setMessages(data.messages || []);
      } catch (error) {
        console.error(error);
      }
    };
    fetchHistory();
  }, [partnerId, authHeaders]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Strict own-check: normalise both sides to plain strings before compare
  const isOwn = (msg) => {
    const senderId = getId(msg.sender?._id ?? msg.sender);
    return Boolean(myId) && Boolean(senderId) && senderId === myId;
  };

  const sendMessage = async () => {
    const text = newMessage.trim();
    if (!text || !socketRef.current || isSendingRef.current) return;

    isSendingRef.current = true;
    socketRef.current.emit('sendMessage', {
      sender: myId,
      receiver: partnerId,
      message: text,
      messageType: 'text',
    });
    setNewMessage('');
    setShowEmoji(false);
    socketRef.current.emit('stopTyping', {
      sender: myId,
      receiver: partnerId,
    });
    setTimeout(() => {
      isSendingRef.current = false;
    }, 400);
  };

  const sendImage = async (file) => {
    if (!file || !socketRef.current || uploading) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const { data } = await axios.post(
        `${server}/api/chat/upload`,
        formData,
        {
          ...authHeaders(),
          headers: {
            ...authHeaders().headers,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const caption = newMessage.trim();
      socketRef.current.emit('sendMessage', {
        sender: myId,
        receiver: partnerId,
        message: caption,
        messageType: 'image',
        imageUrl: data.imageUrl,
      });
      setNewMessage('');
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleReaction = (messageId, emoji) => {
    socketRef.current?.emit('chat:react', {
      messageId,
      emoji,
      userId: myId,
    });
    setActiveReactionMsg(null);
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (!socketRef.current) return;
    socketRef.current.emit('typing', {
      sender: myId,
      receiver: partnerId,
      senderName: user?.name,
    });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('stopTyping', { sender: myId, receiver: partnerId });
    }, 1000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (d) =>
    new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatDate = (d) => {
    const date = new Date(d);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const grouped = messages.reduce((g, m) => {
    const k = new Date(m.createdAt).toDateString();
    if (!g[k]) g[k] = [];
    g[k].push(m);
    return g;
  }, {});

  const mediaUrl = (path) =>
    path?.startsWith('http') ? path : `${server}${path}`;

  const typingLabel = [...typingUsers.values()][0];

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-header-avatar">
          {receiverName?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div className="chat-header-info">
          <h3>{receiverName}</h3>
          <span className="header-status">Direct message</span>
        </div>
      </div>

      <div className="messages" onClick={() => { setShowEmoji(false); setActiveReactionMsg(null); }}>
        {messages.length === 0 && (
          <div className="no-messages">
            <div className="no-messages-icon">👋</div>
            <p>Say hello to {receiverName}!</p>
            <small>Messages are saved — you can continue anytime after login.</small>
          </div>
        )}

        {Object.entries(grouped).map(([date, msgs]) => (
          <div key={date} className="date-group">
            <div className="date-header">{formatDate(date)}</div>
            {msgs.map((msg) => {
              const own = isOwn(msg);
              const senderId  = getId(msg.sender?._id ?? msg.sender);
              const senderName = msg.sender?.name || 'Unknown';
              // "You" on own messages so sender is always visible and unambiguous
              const displayName = own ? 'You' : senderName;
              const nameColor   = own ? 'rgba(255,255,255,0.85)' : userColor(senderId);

              return (
                <div
                  key={getId(msg._id) || `${msg.createdAt}-${msg.message}`}
                  className={`message-row ${own ? 'own' : 'other'}`}
                >
                  {!own && (
                    <div className="msg-avatar" title={senderName} style={{ background: userColor(senderId) }}>
                      {senderName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className={`message-bubble ${own ? 'sent' : 'received'}`}>
                    {/* Always show who sent this message */}
                    <span className="msg-sender-name" style={{ color: nameColor }}>
                      {displayName}
                    </span>

                    {msg.messageType === 'image' && msg.imageUrl && (
                      <a
                        href={mediaUrl(msg.imageUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="msg-image-link"
                      >
                        <img
                          src={mediaUrl(msg.imageUrl)}
                          alt="Shared"
                          className="msg-image"
                        />
                      </a>
                    )}

                    {msg.message && <p className="msg-text">{msg.message}</p>}

                    <div className="msg-meta">
                      <span className="msg-time">{formatTime(msg.createdAt)}</span>
                    </div>

                    {msg.reactions?.length > 0 && (
                      <div className="msg-reactions">
                        {msg.reactions.map((r, i) => (
                          <span key={`${r.userId}-${r.emoji}-${i}`} className="reaction-chip" title={r.userName}>
                            {r.emoji}
                          </span>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      className="react-toggle-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveReactionMsg(
                          activeReactionMsg === getId(msg._id) ? null : getId(msg._id)
                        );
                      }}
                      title="React"
                    >
                      😀
                    </button>

                    {activeReactionMsg === getId(msg._id) && (
                      <div className="reaction-picker" onClick={(e) => e.stopPropagation()}>
                        {REACTION_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className="reaction-pick-btn"
                            onClick={() => toggleReaction(getId(msg._id), emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {typingLabel && (
          <div className="typing-indicator">
            <span />
            <span />
            <span />
            <em>{typingLabel} is typing...</em>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showEmoji && (
        <div className="emoji-picker" onClick={(e) => e.stopPropagation()}>
          {EMOJIS.map((e) => (
            <button key={e} type="button" className="emoji-item" onClick={() => setNewMessage((p) => p + e)}>
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="input-container">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => sendImage(e.target.files?.[0])}
        />
        <button
          type="button"
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Send image"
        >
          {uploading ? '⏳' : '📷'}
        </button>
        <button
          type="button"
          className="emoji-btn"
          onClick={(e) => { e.stopPropagation(); setShowEmoji((p) => !p); }}
          title="Emoji"
        >
          😊
        </button>
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={uploading ? 'Uploading image...' : 'Type a message...'}
          disabled={uploading}
        />
        <button
          type="button"
          className="send-btn"
          onClick={sendMessage}
          disabled={!newMessage.trim() || isSendingRef.current}
          title="Send"
        >
          ➤
        </button>
      </div>
    </div>
  );
};

export default Chat;
