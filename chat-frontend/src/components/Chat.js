import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import EmojiPicker from 'emoji-picker-react'; // <-- NEW: Import emoji picker
import './Chat.css';

// Helper function to create a consistent DM room name
const getDMRoomName = (user1, user2) => {
  return [user1, user2].sort().join('-');
};

const Chat = ({ token, username, onLogout }) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [room, setRoom] = useState('general');
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);

  // --- NEW STATE FOR FEATURES ---
  const [showPicker, setShowPicker] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);
  // -----------------------------

  useEffect(() => {
    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
    const newSocket = io(socketUrl, { auth: { token } });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('joinRoom', room);
    });

    newSocket.on('disconnect', () => setIsConnected(false));
    newSocket.on('loadHistory', (history) => setMessages(history || []));
    newSocket.on('chatMessage', (messageData) => setMessages(prev => [...prev, messageData]));

    // --- NEW SOCKET LISTENERS ---
    newSocket.on('updateUserList', (users) => {
      setOnlineUsers(users.filter(u => u !== username)); // Filter out ourself
    });

    newSocket.on('typing', ({ username: typingUser }) => {
      if (typingUser !== username) {
        setTypingUsers((prev) => [...new Set([...prev, typingUser])]);
      }
    });

    newSocket.on('stopTyping', ({ username: typingUser }) => {
      setTypingUsers((prev) => prev.filter(u => u !== typingUser));
    });
    // ----------------------------

    setSocket(newSocket);
    return () => newSocket.close();
  }, [token, room, username]); // <-- Add username

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && socket?.connected) {
      socket.emit('chatMessage', { room, content: message.trim() });
      // Stop typing immediately after sending
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.emit('stopTyping', { room });
      setMessage('');
    }
  };

  const handleRoomChange = (newRoom) => {
    if (socket && newRoom !== room) {
      // Leave the old room (stops typing indicators)
      socket.emit('stopTyping', { room });
      
      // Join the new room
      socket.emit('joinRoom', newRoom);
      setRoom(newRoom);
      setMessages([]); // Clear messages for the new room
      setTypingUsers([]); // Clear typing users
    }
  };

  // --- NEW HANDLERS ---
  const handleDMClick = (dmUsername) => {
    const dmRoomName = `dm:${getDMRoomName(username, dmUsername)}`;
    handleRoomChange(dmRoomName);
  };
  
  const onEmojiClick = (emojiObject) => {
    setMessage(prev => prev + emojiObject.emoji);
    setShowPicker(false);
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);

    if (socket?.connected) {
      // Emit "typing" event
      socket.emit('typing', { room });

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set a new timeout to emit "stopTyping" after 1.5s of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stopTyping', { room });
      }, 1500);
    }
  };
  // --------------------

  // Helper to display room name nicely (e.g., shows username for DMs)
  const getDisplayRoomName = () => {
    if (room.startsWith('dm:')) {
      const otherUser = room.split(':')[1].split('-').find(u => u !== username);
      return `@${otherUser}`;
    }
    return `#${room}`;
  };

  return (
    <div className="chat-app">
      <div className="sidebar">
        <div className="user-info">
          <h3>Welcome, {username}!</h3>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
        
        <div className="rooms">
          <h4>Rooms</h4>
          {['general', 'random', 'tech', 'gaming'].map(roomName => (
            <button
              key={roomName}
              className={`room-btn ${room === roomName ? 'active' : ''}`}
              onClick={() => handleRoomChange(roomName)}
            >
              #{roomName}
            </button>
          ))}
        </div>

        {/* --- NEW ONLINE USERS LIST (for DMs) --- */}
        <div className="online-users">
          <h4>Online Users ({onlineUsers.length})</h4>
          {onlineUsers.map(user => (
            <button
              key={user}
              className={`room-btn dm-btn ${room.includes(user) ? 'active' : ''}`}
              onClick={() => handleDMClick(user)}
            >
              <span className="online-dot">●</span> {user}
            </button>
          ))}
        </div>
        {/* ------------------------------------- */}
      </div>

      <div className="chat-main">
        <div className="chat-header">
          <h2>{getDisplayRoomName()}</h2> {/* <-- Updated this */}
          <span style={{color: isConnected ? 'green' : 'red', fontSize: '12px'}}>
            ● {isConnected ? 'Connected' : 'Not connected'}
          </span>
        </div>

        <div className="messages-container">
          <div className="messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.username === username ? 'own' : ''}`}>
                <div className="message-content">
                  <div className="message-header">
                    <span className="username">{msg.username}</span>
                    <span className="time">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="message-text">{msg.content}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {/* --- NEW EMOJI PICKER --- */}
        <div className="picker-container">
          {showPicker && (
            <EmojiPicker onEmojiClick={onEmojiClick} />
          )}
        </div>
        {/* ------------------------ */}

        {/* --- NEW TYPING INDICATOR --- */}
        <div className="typing-indicator">
          {typingUsers.length > 0 && 
            !room.startsWith('dm:') && // Don't show in DMs for simplicity, can add later
            `${typingUsers.join(', ')} ${typingUsers.length === 1 ? 'is' : 'are'} typing...`
          }
        </div>
        {/* ---------------------------- */}

        <form onSubmit={handleSubmit} className="message-form">
          {/* --- NEW EMOJI BUTTON --- */}
          <button 
            type="button" 
            onClick={() => setShowPicker(!showPicker)} 
            className="emoji-btn"
          >
            😊
          </button>
          {/* ------------------------ */}
          <input
            type="text"
            value={message}
            onChange={handleTyping} // <-- UPDATED
            placeholder={`Message ${getDisplayRoomName()}...`} // <-- Updated
            className="message-input"
            disabled={!isConnected} // Disable if not connected
          />
          <button type="submit" className="send-btn" disabled={!isConnected}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;