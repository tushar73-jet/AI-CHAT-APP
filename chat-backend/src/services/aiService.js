const prisma = require('../config/prisma');

async function getBotUser() {
  try {
    let botUser = await prisma.user.findUnique({ where: { username: 'AI Bot' } });
    if (!botUser) {
      botUser = await prisma.user.create({
        data: { username: 'AI Bot' }
      });
    }
    return botUser;
  } catch (err) {
    console.error('Error getting bot user:', err);
    return null;
  }
}


async function getAIResponse(message) {
  if (!process.env.GROQ_API_KEY) {
    return "AI service is not configured.";
  }

  try {
    const fetchFn = globalThis.fetch || require('node-fetch');
    const response = await fetchFn("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
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


module.exports = {
  getBotUser,
  getAIResponse
};
