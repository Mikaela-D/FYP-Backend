// C:\Users\Mikaela\FYP-Backend\routes\openai.js

require("dotenv").config();
let express = require("express");
let router = express.Router();
const OpenAI = require("openai");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Initialize session middleware
const session = require("express-session");
router.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true if using HTTPS
  })
);

console.log("OpenAI module loaded successfully");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let dailyUsage = 0;
const DAILY_LIMIT = 1000; // Limit AI interactions

// Define Message Schema
const messageSchema = new Schema(
  {
    role: String,
    content: String,
    timestamp: { type: Date, default: Date.now },
    customerId: { type: Schema.Types.ObjectId, ref: "customers" }, // Add customerId field
  },
  { collection: "messages" }
);

let Messages = mongoose.model("messages", messageSchema);

// Send Message and Get AI Response
router.post("/sendMessage", async (req, res) => {
  console.log("Received request:", req.body); // Debugging log

  const { message, conversation, customerId } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  // Validate customerId
  if (!customerId) {
    return res.status(400).json({ error: "customerId is required" });
  }

  if (dailyUsage >= DAILY_LIMIT) {
    return res.status(429).json({ error: "Daily usage limit reached" });
  }

  // Always ensure the system prompt is the first message
  const systemPrompt = {
    role: "system",
    content:
      "You are a customer needing product support for your mobile device and you are contacting an agent that will help you.",
  };

  let conversationHistory = [];
  if (conversation && Array.isArray(conversation)) {
    // Remove any existing system prompt from frontend
    const filtered = conversation.filter((msg) => msg.role !== "system");
    conversationHistory = [systemPrompt, ...filtered];
  } else if (req.session.conversation) {
    // Remove any duplicate system prompt
    const filtered = req.session.conversation.filter(
      (msg) => msg.role !== "system"
    );
    conversationHistory = [systemPrompt, ...filtered];
  } else {
    conversationHistory = [systemPrompt];
  }

  // Add user message to conversation history with explicit role
  conversationHistory.push({ role: "user", content: `Agent: ${message}` });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: conversationHistory,
      max_tokens: 150,
    });

    console.log("AI Response:", response); // Debugging log

    const aiReply =
      response.choices[0]?.message?.content?.trim() || "No response";
    dailyUsage += response.usage?.total_tokens || 0;

    // Add AI response to conversation history with explicit role
    conversationHistory.push({
      role: "assistant",
      content: `Customer: ${aiReply}`,
    });

    // Update session conversation history
    req.session.conversation = conversationHistory;

    // Save user message to database with customerId
    await Messages.create({
      role: "user",
      content: `Agent: ${message}`,
      customerId: new mongoose.Types.ObjectId(customerId),
    });

    // Save AI response to database with customerId
    await Messages.create({
      role: "assistant",
      content: `Customer: ${aiReply}`,
      customerId: new mongoose.Types.ObjectId(customerId),
    });

    res.json({ reply: aiReply });
  } catch (error) {
    console.error("Error generating AI response:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get conversation history for a customer
router.get("/messages/:customerId", async (req, res) => {
  const { customerId } = req.params;
  if (!customerId) {
    return res.status(400).json({ error: "customerId is required" });
  }

  try {
    console.log("DEBUG: Looking for messages with customerId:", customerId);

    // Show all messages in the database for debugging
    const allMessages = await Messages.find({}).lean();
    console.log("DEBUG: All messages in DB:", allMessages);

    // Find all messages for this customer, sorted by timestamp
    const query = {
      customerId: new mongoose.Types.ObjectId(customerId),
    };
    console.log("DEBUG: Query being used:", query);

    const messages = await Messages.find(query).sort({ timestamp: 1 }).lean();

    console.log(
      "DEBUG: Fetched messages for customerId",
      customerId,
      ":",
      messages
    );

    res.json({ messages });
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
