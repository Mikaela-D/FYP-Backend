// C:\Users\Mikaela\FYP-Backend\routes\agents.js

let express = require("express");
let router = express.Router();
let mongoose = require("mongoose");
let Schema = mongoose.Schema;
const bcrypt = require("bcrypt");

// Use the default mongoose instance
mongoose.connect("mongodb://127.0.0.1:27017/db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define Agent Schema
const agentSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { collection: "agents" }
);

let Agents = mongoose.model("agents", agentSchema);

// Fetch Agents
router.get("/agents", async (req, res) => {
  try {
    const agents = await Agents.find();
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch Single Agent by Name (for 'Assign to Me')
router.get("/agents/by-name/:name", async (req, res) => {
  try {
    const agent = await Agents.findOne({ name: req.params.name });
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register a New Agent
router.post("/agents/register", async (req, res) => {
  const { name, password } = req.body;

  try {
    // Check if agent already exists
    const existingAgent = await Agents.findOne({ name });
    if (existingAgent) {
      return res
        .status(400)
        .json({ success: false, message: "Agent already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save the new agent
    const newAgent = new Agents({ name, password: hashedPassword });
    await newAgent.save();

    res
      .status(201)
      .json({ success: true, message: "Agent registered successfully" });
  } catch (err) {
    console.error("Error registering agent:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to register agent" });
  }
});

module.exports = router;
