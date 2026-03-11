const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { corsOptions } = require('./config/cors');
const authRoutes = require('./routes/auth');

const app = express();

app.use(cors(corsOptions));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later."
});
app.use(limiter);

app.use('/api/auth', authRoutes);

// Global API error handler
app.use((err, req, res, next) => {
  console.error("API Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

module.exports = app;
