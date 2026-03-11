require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = require('./src/app');
const { corsOptions } = require('./src/config/cors');
const { setupRedisAdapter } = require('./src/config/redis');
const authSocket = require('./src/middleware/authSocket');
const { setupSockets } = require('./src/sockets');
const { startCleanupJob } = require('./src/jobs/cleanup');

const server = http.createServer(app);

const io = new Server(server, { cors: corsOptions });

// Middleware for socket auth
io.use(authSocket);

// Initialize Redis adapter if URL is available
setupRedisAdapter(io);

// Setup WebSockets
setupSockets(io);

// Start background job for deleting old messages
startCleanupJob();

const PORT = process.env.PORT || 3005;

const startServer = (port) => {
  const serverInstance = server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  serverInstance.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error("Server error:", err);
    }
  });
};

startServer(PORT);