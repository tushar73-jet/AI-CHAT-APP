require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const prisma = require('./src/config/prisma');
const authRoutes = require('./src/routes/auth');
const authSocket = require('./src/middleware/authSocket');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);

const userSockets = new Map();

async function getBotUser() {
  try {
    let botUser = await prisma.user.findUnique({ where: { username: 'AI Bot' } });
    if (!botUser) {
      const hashedPassword = await bcrypt.hash('bot_'+ Date.now(), 10);
      botUser = await prisma.user.create({
        data: { username: 'AI Bot', password_hash: hashedPassword }
      });
    }
    return botUser;
  } catch (err) {
    console.error('Error getting bot user:', err);
    return null;
  }
}

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3002'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/api/auth', authRoutes);

const io = new Server(server, { cors: corsOptions });
io.use(authSocket);

async function getAIResponse(message) {
  if (!process.env.OPENAI_API_KEY) {
    return "AI service is not configured.";
  }

  try {
    const fetchFn = globalThis.fetch || require('node-fetch');
    const response = await fetchFn("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a friendly AI chatbot." },
          { role: "user", content: message }
        ]
      })
    });

    if (!response.ok) {
      return "AI service error. Please check your API key.";
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Sorry, I couldn't understand that.";
  } catch (err) {
    return "AI bot failed to respond.";
  }
}


io.on('connection', (socket) => {

  socket.username = socket.user.username;
  userSockets.set(socket.username, socket.id);
  io.emit('updateUserList', Array.from(userSockets.keys()));

  socket.on('joinRoom', async (room) => {
    socket.join(room);
    
    try {
      const messages = await prisma.message.findMany({
        where: { room },
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { username: true } } }
      });
      
      socket.emit('loadHistory', messages.map(msg => ({
        content: msg.content,
        username: msg.user.username,
        createdAt: msg.createdAt
      })));
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('chatMessage', async (data) => {
    const { room, content } = data;

    try {
      const msg = await prisma.message.create({
        data: { content, room, userId: socket.user.id }
      });

      const messageData = {
        content: msg.content,
        username: socket.user.username,
        createdAt: msg.createdAt
      };

      if (room.startsWith('dm:')) {
        const usernames = room.split(':')[1].split('-');
        const otherUser = usernames.find(u => u !== socket.username);
        const recipientSocketId = userSockets.get(otherUser);

        if (recipientSocketId) {
          io.to(recipientSocketId).emit('chatMessage', messageData);
        }

        socket.emit('chatMessage', messageData);

      } else {

        io.to(room).emit('chatMessage', messageData);
      }


      if (content.toLowerCase().startsWith('@bot') && !room.startsWith('dm:')) {
        const userPrompt = content.replace(/@bot/gi, '').trim();
        if (userPrompt) {
          const aiReply = await getAIResponse(userPrompt);
          const botUser = await getBotUser();
          
          if (botUser) {
            const botMsg = await prisma.message.create({
              data: { content: aiReply, room, userId: botUser.id }
            });
            
            io.to(room).emit('chatMessage', {
              content: botMsg.content,
              username: botUser.username,
              createdAt: botMsg.createdAt
            });
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('typing', ({ room }) => {
    socket.to(room).emit('typing', { username: socket.username });
  });

  socket.on('stopTyping', ({ room }) => {
    socket.to(room).emit('stopTyping', { username: socket.username });
  });


  socket.on('disconnect', () => {
    userSockets.delete(socket.username);
    io.emit('updateUserList', Array.from(userSockets.keys()));
  });

});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});