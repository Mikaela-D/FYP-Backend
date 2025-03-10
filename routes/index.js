// C:\Users\Mikaela\FYP-Backend\routes\index.js

require("dotenv").config();
let express = require("express");
let router = express.Router();
const OpenAI = require("openai");

console.log("OpenAI module loaded successfully");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let dailyUsage = 0;
const DAILY_LIMIT = 20; // Limit AI interactions to 20 per day

let mongoose = require("mongoose");
let Schema = mongoose.Schema;

// Use the default mongoose instance
mongoose.connect("mongodb://127.0.0.1:27017/db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let clientSchema = new Schema(
  {
    clientId: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    }, // Auto-generate if not provided
    customerName: String,
    customerPhone: String,
    customerEmail: { type: String, unique: true },
  },
  { collection: "clients" }
);

const ticketSchema = new Schema(
  {
    ticketId: { type: String, unique: true },
    title: String,
    clientId: { type: Schema.Types.ObjectId, ref: "clients" },
    category: String,
    priority: String,
    status: String,
    description: String,
    image: String,
    assignedTo: { type: Schema.Types.ObjectId, ref: "agents", default: null }, // New field for agent assignment
  },
  { collection: "tickets" }
);

// Define Agent Schema
const agentSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { collection: "agents" }
);

let Clients = mongoose.model("clients", clientSchema);
let Tickets = mongoose.model("tickets", ticketSchema);
let Agents = mongoose.model("agents", agentSchema);

// Admin server page
router.get("/", async function (req, res, next) {
  res.render("index");
});

// Create Ticket
router.post("/createTicket", async function (req, res) {
  let retVal = { response: "fail" };
  let { customerName, customerPhone, customerEmail, ...ticketData } = req.body;

  try {
    let client = await Clients.findOne({ customerEmail });

    if (!client) {
      client = await Clients.create({
        clientId: new mongoose.Types.ObjectId().toString(), // Explicitly setting clientId
        customerName,
        customerPhone,
        customerEmail,
      });
    }

    let ticket = await Tickets.create({
      ...ticketData,
      clientId: client._id, // Ensuring ObjectId reference
    });

    retVal = { response: "success", ticketId: ticket._id };
  } catch (err) {
    console.error("Error creating ticket:", err);
    retVal.error = err.message;
  }

  res.json(retVal);
});

// cRud   Should use GET . . . we'll fix this is Cloud next term
// Retrieve Tickets
router.post("/readTicket", async function (req, res) {
  try {
    let data =
      req.body.cmd === "all"
        ? await Tickets.find()
            .populate("clientId")
            .populate("assignedTo")
            .lean()
        : await Tickets.findOne({ _id: req.body._id })
            .populate("clientId")
            .populate("assignedTo")
            .lean();
    // Ensure customer details are properly extracted
    if (data) {
      if (Array.isArray(data)) {
        data = data.map((ticket) => ({
          ...ticket,
          customerName: ticket.clientId?.customerName || "N/A",
          customerPhone: ticket.clientId?.customerPhone || "N/A",
          customerEmail: ticket.clientId?.customerEmail || "N/A",
          assignedTo: ticket.assignedTo
            ? ticket.assignedTo._id.toString()
            : "Unassigned",
        }));
      } else {
        data.customerName = data.clientId?.customerName || "N/A";
        data.customerPhone = data.clientId?.customerPhone || "N/A";
        data.customerEmail = data.clientId?.customerEmail || "N/A";
        data.assignedTo = data.assignedTo
          ? data.assignedTo._id.toString()
          : "Unassigned";
      }
    }

    res.json({ tickets: data });
  } catch (error) {
    console.error("Error retrieving tickets:", error);
    res.json({ tickets: [], error: error.message });
  }
});

// crUd   Should use PUT . . . we'll fix this is Cloud next term
// Update Ticket
router.put("/updateTicket", async function (req, res) {
  console.log("Updating ticket:", req.body); // Debugging

  if (!req.body._id || !mongoose.Types.ObjectId.isValid(req.body._id)) {
    return res
      .status(400)
      .json({ response: "fail", error: "Invalid or missing _id" });
  }

  try {
    const result = await Tickets.findByIdAndUpdate(req.body._id, req.body, {
      new: true,
    });

    if (!result) {
      return res
        .status(404)
        .json({ response: "fail", error: "Ticket not found" });
    }

    res.json({ response: "success", ticket: result });
  } catch (err) {
    console.error("Error updating ticket:", err);
    res.json({ response: "fail", error: err.message });
  }
});

// cruD   Should use DELETE . . . we'll fix this is Cloud next term
// Delete Ticket
router.post("/deleteTicket", async function (req, res) {
  try {
    await Tickets.deleteOne({ _id: req.body._id });
    res.json({ response: "success" });
  } catch (err) {
    console.error("Error deleting ticket:", err);
    res.json({ response: "fail", error: err.message });
  }
});

// Save Ticket
router.post("/saveTicket", async function (req, res) {
  try {
    let ticket = await Tickets.create(req.body);
    res.json({ saveTicketResponse: "success", ticketId: ticket._id });
  } catch (err) {
    console.error("Could not insert new ticket:", err);
    res.json({ saveTicketResponse: "fail", error: err.message });
  }
});

// Assign Agent to Ticket
router.put("/tickets/:id/assign", async (req, res) => {
  console.log(
    "Received request to assign agent:",
    req.body.agentId,
    "to ticket:",
    req.params.id
  );

  try {
    let { agentId } = req.body;
    let ticketId = req.params.id;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(ticketId) || ticketId.length !== 24) {
      console.error("Invalid ticketId:", ticketId);
      return res.status(400).json({ error: "Invalid ticketId format" });
    }

    if (!mongoose.Types.ObjectId.isValid(agentId) || agentId.length !== 24) {
      console.error("Invalid agentId:", agentId);
      return res.status(400).json({ error: "Invalid agentId format" });
    }

    // Convert to ObjectId before querying MongoDB
    ticketId = new mongoose.Types.ObjectId(ticketId);
    agentId = new mongoose.Types.ObjectId(agentId);

    const result = await Tickets.findByIdAndUpdate(
      ticketId,
      { assignedTo: agentId },
      { new: true }
    );

    console.log("Ticket update result:", result);

    if (!result) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    res.json({ success: true, ticket: result });
  } catch (err) {
    console.error("Error assigning ticket:", err);
    res.status(500).json({ error: err.message });
  }
});

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

// Fetch Tickets by Agent Name
router.get("/tickets/by-agent/:name", async (req, res) => {
  try {
    const agent = await Agents.findOne({ name: req.params.name });

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    const tickets = await Tickets.find({ assignedTo: agent._id })
      .populate("clientId")
      .lean();

    const formattedTickets = tickets.map((ticket) => ({
      ...ticket,
      customerName: ticket.clientId?.customerName || "N/A",
      customerPhone: ticket.clientId?.customerPhone || "N/A",
      customerEmail: ticket.clientId?.customerEmail || "N/A",
    }));

    res.json({ tickets: formattedTickets });
  } catch (err) {
    console.error("Error fetching tickets for agent:", err);
    res.status(500).json({ error: err.message });
  }
});

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
      messages: [{ role: "user", content: message }],
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
