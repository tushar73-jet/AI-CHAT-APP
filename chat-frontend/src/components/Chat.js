import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import EmojiPicker from 'emoji-picker-react'; 
import './Chat.css';

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

  const [showPicker, setShowPicker] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);

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

    newSocket.on('updateUserList', (users) => {
      setOnlineUsers(users.filter(u => u !== username)); 
    });

    newSocket.on('typing', ({ username: typingUser }) => {
      if (typingUser !== username) {
        setTypingUsers((prev) => [...new Set([...prev, typingUser])]);
      }
    });

    newSocket.on('stopTyping', ({ username: typingUser }) => {
      setTypingUsers((prev) => prev.filter(u => u !== typingUser));
    });


    setSocket(newSocket);
    return () => newSocket.close();
  }, [token, room, username]); 

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && socket?.connected) {
      socket.emit('chatMessage', { room, content: message.trim() });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.emit('stopTyping', { room });
      setMessage('');
    }
  };

  const handleRoomChange = (newRoom) => {
    if (socket && newRoom !== room) {
      socket.emit('stopTyping', { room });
      
      socket.emit('joinRoom', newRoom);
      setRoom(newRoom);
      setMessages([]);
      setTypingUsers([]); 
    }
  };

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
      socket.emit('typing', { room });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stopTyping', { room });
      }, 1500);
    }
  };


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
      </div>

      <div className="chat-main">
        <div className="chat-header">
          <h2>{getDisplayRoomName()}</h2> 
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
        
        <div className="picker-container">
          {showPicker && (
            <EmojiPicker onEmojiClick={onEmojiClick} />
          )}
        </div>

        <div className="typing-indicator">
          {typingUsers.length > 0 && 
            !room.startsWith('dm:') &&
            `${typingUsers.join(', ')} ${typingUsers.length === 1 ? 'is' : 'are'} typing...`
          }
        </div>

        <form onSubmit={handleSubmit} className="message-form">
          <button 
            type="button" 
            onClick={() => setShowPicker(!showPicker)} 
            className="emoji-btn"
          >
            😊
          </button>
          <input
            type="text"
            value={message}
            onChange={handleTyping} 
            placeholder={`Message ${getDisplayRoomName()}...`} 
            className="message-input"
            disabled={!isConnected} 
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