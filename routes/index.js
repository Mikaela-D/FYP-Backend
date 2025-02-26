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
    clientId: { type: String, default: () => new mongoose.Types.ObjectId().toString() }, // Auto-generate if not provided
    customerName: String,
    customerPhone: String,
    customerEmail: { type: String, unique: true },
  },
  { collection: "clients" }
);

const meetingSchema = new Schema(
  {
    meetingId: { type: String, unique: true },
    title: String,
    clientId: { type: Schema.Types.ObjectId, ref: "clients" },
    category: String,
    priority: String,
    status: String,
    description: String,
    image: String,
  },
  { collection: "meetings" }
);

let Clients = mongoose.model("clients", clientSchema);
let Meetings = mongoose.model("meetings", meetingSchema);

// Admin server page
router.get("/", async function (req, res, next) {
  res.render("index");
});

// Create Meeting
router.post("/createMeeting", async function (req, res) {
  let retVal = { response: "fail" };
  let { customerName, customerPhone, customerEmail, ...meetingData } = req.body;

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

    let meeting = await Meetings.create({
      ...meetingData,
      clientId: client._id, // Ensuring ObjectId reference
    });

    retVal = { response: "success", meetingId: meeting._id };
  } catch (err) {
    console.error("Error creating meeting:", err);
    retVal.error = err.message;
  }

  res.json(retVal);
});

// cRud   Should use GET . . . we'll fix this is Cloud next term
// Retrieve Meetings
router.post("/readMeeting", async function (req, res) {
  try {
    let data = req.body.cmd === "all" ? await Meetings.find().populate("clientId").lean() : await Meetings.findOne({ _id: req.body._id }).populate("clientId").lean();
// Ensure customer details are properly extracted
    if (data) {
      if (Array.isArray(data)) {
        data = data.map(meeting => ({
          ...meeting,
          customerName: meeting.clientId?.customerName || "N/A",
          customerPhone: meeting.clientId?.customerPhone || "N/A",
          customerEmail: meeting.clientId?.customerEmail || "N/A",
        }));
      } else {
        data.customerName = data.clientId?.customerName || "N/A";
        data.customerPhone = data.clientId?.customerPhone || "N/A";
        data.customerEmail = data.clientId?.customerEmail || "N/A";
      }
    }

    res.json({ meetings: data });
  } catch (error) {
    console.error("Error retrieving meetings:", error);
    res.json({ meetings: [], error: error.message });
  }
});

// crUd   Should use PUT . . . we'll fix this is Cloud next term
// Update Meeting
router.post("/updateMeeting", async function (req, res) {
  try {
    await Meetings.findOneAndUpdate({ _id: req.body._id }, req.body);
    res.json({ response: "success" });
  } catch (err) {
    console.error("Error updating meeting:", err);
    res.json({ response: "fail", error: err.message });
  }
});

// cruD   Should use DELETE . . . we'll fix this is Cloud next term
// Delete Meeting
router.post("/deleteMeeting", async function (req, res) {
  try {
    await Meetings.deleteOne({ _id: req.body._id });
    res.json({ response: "success" });
  } catch (err) {
    console.error("Error deleting meeting:", err);
    res.json({ response: "fail", error: err.message });
  }
});

// Save Meeting
router.post("/saveMeeting", async function (req, res) {
  try {
    let meeting = await Meetings.create(req.body);
    res.json({ saveMeetingResponse: "success", meetingId: meeting._id });
  } catch (err) {
    console.error("Could not insert new meeting:", err);
    res.json({ saveMeetingResponse: "fail", error: err.message });
  }
});

module.exports = router;