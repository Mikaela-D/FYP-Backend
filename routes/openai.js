// C:\Users\Mikaela\FYP-Backend\routes\openai.js

require("dotenv").config();
let express = require("express");
let router = express.Router();
const OpenAI = require("openai");

console.log("OpenAI module loaded successfully");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let dailyUsage = 0;
const DAILY_LIMIT = 100; // Limit AI interactions to 100 per day

// Send Message and Get AI Response
router.post("/sendMessage", async (req, res) => {
  console.log("Received request:", req.body); // Debugging log

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  if (dailyUsage >= DAILY_LIMIT) {
    return res.status(429).json({ error: "Daily usage limit reached" });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a customer needing product support for your mobile device and you are contacting an agent that will help you.",
        },
        { role: "user", content: message },
      ],
      max_tokens: 150,
    });

    console.log("AI Response:", response); // Debugging log

    const aiReply =
      response.choices[0]?.message?.content?.trim() || "No response";
    dailyUsage += response.usage?.total_tokens || 0;

    res.json({ reply: aiReply });
  } catch (error) {
    console.error("Error generating AI response:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
