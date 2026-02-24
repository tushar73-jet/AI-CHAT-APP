# AI Chat Application

A robust, real-time chat application featuring user authentication, direct/group messaging, and an integrated AI assistant powered by Groq.

## 🚀 Features

- **Real-Time Messaging**: Instant communication powered by [Socket.io](https://socket.io/).
- **AI Chatbot Integration**: Mention `@bot` in any room to interact with an AI assistant (uses Groq API).
- **Direct Messaging & Rooms**: Support for shared chat rooms and private 1-on-1 (DM) conversations.
- **Authentication**: Secure user registration and login using JWT and `bcrypt`.
- **Typing Indicators**: See when other users are tying in real-time.
- **Database Persistence**: Messages and users are securely stored in PostgreSQL using [Prisma ORM](https://www.prisma.io/).
- **Scalable Architecture**: Optional [Redis](https://redis.io/) adapter for Socket.io, enabling horizontal scaling.
- **API Rate Limiting**: Built-in rate limiting with `express-rate-limit` to prevent abuse.
- **Auto-Cleanup**: Background job automatically deletes messages older than 7 days to conserve database space.

## 🛠️ Tech Stack

### Backend
- **Node.js** & **Express**
- **Socket.io** (with `@socket.io/redis-adapter` support)
- **Prisma** (PostgreSQL)
- **Groq API**
- **JWT** (JSON Web Tokens) & **Bcrypt** for Auth
- **ioredis** (Redis client)

### Frontend
- **React** (Create React App)
- **Socket.io-client**
- **Axios**
- **emoji-picker-react**

## 🏁 Getting Started

Follow these instructions to set up the project locally.

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- A [PostgreSQL](https://www.postgresql.org/) database
- (Optional) A [Redis](https://redis.io/) server for Socket.io scaling
- A [Groq API Key](https://console.groq.com/keys) for the `@bot` feature

### 1. Database Setup

Create a new PostgreSQL database and save its connection URL.

### 2. Backend Setup

Open a terminal and navigate to the backend directory:

```bash
cd chat-backend
npm install
```

Create a `.env` file in the `chat-backend` directory and configure the environment variables:

```env
# Server Port (Default is 3005)
PORT=3005

# Prisma Database Connection
DATABASE_URL="postgresql://user:password@localhost:5432/chat_db?schema=public"

# JWT Secret for Authentication
JWT_SECRET="your_super_secret_jwt_key_here"

# Groq API Key for the AI Chatbot
GROQ_API_KEY="your_groq_api_key_here"

# (Optional) Redis URL for multi-instance Socket.io scaling
# REDIS_URL="redis://localhost:6379"

# (Optional) Allowed CORS Origins for the frontend
# ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"
```

Initialize the database schema with Prisma:

```bash
npx prisma db push
# or run `npx prisma migrate dev` if you prefer migrations
```

Start the backend server:

```bash
npm start
# The backend will run on http://localhost:3005
```

### 3. Frontend Setup

Open a new terminal and navigate to the frontend directory:

```bash
cd chat-frontend
npm install
```

Start the frontend development server:

```bash
npm start
# The frontend will run on http://localhost:3000
```

## 🤖 Using the AI Bot

Once logged in, simply type a message starting with `@bot` in any shared room. The backend will call the Groq API and the bot will reply directly in the chat!

Example:
> `@bot What is the capital of France?`

*Note: The AI Bot is disabled in Direct Messages (DMs) to ensure privacy.*

