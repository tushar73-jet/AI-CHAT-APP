const express = require('express');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { OAuth2Client } = require('google-auth-library');

const router = express.Router();

// The Google Client ID must match the one provided to the frontend
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).send({ error: "Google token is required" });
    }

    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    // Extract payload data
    const payload = ticket.getPayload();
    const { sub: googleId, name, email } = payload;

    // Use the email prefix as a default username if name isn't available
    const baseUsername = name || email.split('@')[0];

    // Find existing user by googleId
    let user = await prisma.user.findUnique({ where: { googleId } });

    if (!user) {
      // First try to find by existing username to link account, or create unique username
      let username = baseUsername.replace(/\s+/g, '_').toLowerCase();
      let usernameExists = await prisma.user.findUnique({ where: { username } });
      let counter = 1;

      while (usernameExists && !usernameExists.googleId) {
        // Find a unique username if the base one exists as a legacy username
        username = `${baseUsername.replace(/\s+/g, '_').toLowerCase()}${counter}`;
        usernameExists = await prisma.user.findUnique({ where: { username } });
        counter++;
      }

      if (usernameExists && usernameExists.googleId) {
        // Edge case: found same username but mapped to another googleId? Unlikely, but fallback
        user = usernameExists;
      } else {
        // Create new user
        user = await prisma.user.create({
          data: { username, googleId }
        });
      }
    }

    // Generate our app's JWT (so socket.io works unchanged)
    const appToken = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.send({ token: appToken, username: user.username });
  } catch (error) {
    console.error("Google verify error:", error);
    res.status(401).send({ error: "Invalid Google token" });
  }
});

module.exports = router;