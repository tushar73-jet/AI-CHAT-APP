const prisma = require('../config/prisma');
const { getAIResponse, getBotUser } = require('../services/aiService');

const userSockets = new Map();

function setupSockets(io) {
  io.on('connection', (socket) => {
    socket.on("error", (err) => {
      console.error("Socket error:", err);
    });

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
}


module.exports = {
  setupSockets
};
