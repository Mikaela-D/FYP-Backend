// C:\Users\Mikaela\FYP-Backend\routes\index.js

let express = require("express");
let router = express.Router();

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
          assignedTo: ticket.assignedTo ? ticket.assignedTo.name : "Unassigned",
        }));
      } else {
        data.customerName = data.clientId?.customerName || "N/A";
        data.customerPhone = data.clientId?.customerPhone || "N/A";
        data.customerEmail = data.clientId?.customerEmail || "N/A";
        data.assignedTo = data.assignedTo ? data.assignedTo.name : "Unassigned";
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
router.post("/updateTicket", async function (req, res) {
  try {
    await Tickets.findOneAndUpdate({ _id: req.body._id }, req.body);
    res.json({ response: "success" });
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
  try {
    const { agentId } = req.body;
    await Tickets.findByIdAndUpdate(req.params.id, { assignedTo: agentId });
    res.json({ success: true });
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

module.exports = router;
