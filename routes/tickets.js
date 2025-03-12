// C:\Users\Mikaela\FYP-Backend\routes\tickets.js

let express = require("express");
let router = express.Router();
let mongoose = require("mongoose");
let Schema = mongoose.Schema;

// Use the default mongoose instance
mongoose.connect("mongodb://127.0.0.1:27017/db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const ticketSchema = new Schema(
  {
    ticketId: { type: String, unique: true },
    title: String,
    customerId: { type: Schema.Types.ObjectId, ref: "customers" },
    category: String,
    priority: String,
    status: String,
    description: String,
    image: String,
    assignedTo: { type: Schema.Types.ObjectId, ref: "agents", default: null }, // New field for agent assignment
  },
  { collection: "tickets" }
);

let Tickets = mongoose.model("tickets", ticketSchema);

// Customer Schema and Model
const customerSchema = new Schema(
  {
    customerId: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    }, // Auto-generate if not provided
    customerName: String,
    customerPhone: String,
    customerEmail: { type: String, unique: true },
  },
  { collection: "customers" }
);

let Customers = mongoose.model("customers", customerSchema);

// Create Customer
router.post("/createCustomer", async function (req, res) {
  let retVal = { response: "fail" };
  let { customerName, customerPhone, customerEmail } = req.body;

  try {
    let customer = await Customers.findOne({ customerEmail });

    if (!customer) {
      customer = await Customers.create({
        customerId: new mongoose.Types.ObjectId().toString(), // Explicitly setting customerId
        customerName,
        customerPhone,
        customerEmail,
      });
      retVal = { response: "success", customerId: customer._id };
    } else {
      retVal.error = "Customer already exists";
    }
  } catch (err) {
    console.error("Error creating customer:", err);
    retVal.error = err.message;
  }

  res.json(retVal);
});

// Fetch Customers
router.get("/customers", async function (req, res) {
  try {
    const customers = await Customers.find().lean();
    res.json({ customers });
  } catch (err) {
    console.error("Error fetching customers:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create Ticket
router.post("/createTicket", async function (req, res) {
  let retVal = { response: "fail" };
  let { customerId, ...ticketData } = req.body;

  try {
    let customer = await Customers.findById(customerId);

    if (!customer) {
      throw new Error("Customer not found");
    }

    let ticket = await Tickets.create({
      ...ticketData,
      customerId: customer._id, // Ensuring ObjectId reference
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
            .populate("customerId")
            .populate("assignedTo")
            .lean()
        : await Tickets.findOne({ _id: req.body._id })
            .populate("customerId")
            .populate("assignedTo")
            .lean();
    // Ensure customer details are properly extracted
    if (data) {
      if (Array.isArray(data)) {
        data = data.map((ticket) => ({
          ...ticket,
          customerName: ticket.customerId?.customerName || "N/A",
          customerPhone: ticket.customerId?.customerPhone || "N/A",
          customerEmail: ticket.customerId?.customerEmail || "N/A",
          assignedTo: ticket.assignedTo
            ? ticket.assignedTo._id.toString()
            : "Unassigned",
        }));
      } else {
        data.customerName = data.customerId?.customerName || "N/A";
        data.customerPhone = data.customerId?.customerPhone || "N/A";
        data.customerEmail = data.customerId?.customerEmail || "N/A";
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

// Fetch Tickets by Agent Name
router.get("/tickets/by-agent/:name", async (req, res) => {
  try {
    const agent = await Agents.findOne({ name: req.params.name });

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    const tickets = await Tickets.find({ assignedTo: agent._id })
      .populate("customerId")
      .lean();

    const formattedTickets = tickets.map((ticket) => ({
      ...ticket,
      customerName: ticket.customerId?.customerName || "N/A",
      customerPhone: ticket.customerId?.customerPhone || "N/A",
      customerEmail: ticket.customerId?.customerEmail || "N/A",
    }));

    res.json({ tickets: formattedTickets });
  } catch (err) {
    console.error("Error fetching tickets for agent:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
