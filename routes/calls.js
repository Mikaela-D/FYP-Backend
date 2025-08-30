// C:\Users\Mikaela\FYP-Backend\routes\calls.js

let express = require("express");
let router = express.Router();
let mongoose = require("mongoose");
let Schema = mongoose.Schema;

mongoose.connect("mongodb://127.0.0.1:27017/db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let callSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "customers",
      required: true,
    },
    callDuration: { type: Number, required: true },
    startTimestamp: { type: Date, required: true },
    endTimestamp: { type: Date, required: true },
    agentId: { type: Schema.Types.ObjectId, ref: "agents" },
    holdCount: { type: Number, default: 0 },
  },
  { collection: "calls" }
);

let Calls = mongoose.model("calls", callSchema);

// Save a new call record
router.post("/", async function (req, res) {
  let retVal = { response: "fail" };
  try {
    const call = await Calls.create(req.body);
    retVal = { response: "success", callId: call._id, call };
  } catch (err) {
    console.error("Error saving call:", err);
    retVal.error = err.message;
  }
  res.json(retVal);
});

// Fetch calls for a specific agent
router.get("/", async function (req, res) {
  try {
    const { agentId } = req.query;
    let query = {};
    if (agentId) {
      query.agentId = agentId;
    }
    const calls = await Calls.find(query).lean();
    res.json({ calls });
  } catch (err) {
    console.error("Error fetching calls:", err);
    res.status(500).json({ error: err.message });
  }
});

// // (Optional) Fetch all calls
// router.get("/", async function (req, res) {
//   try {
//     const calls = await Calls.find().lean();
//     res.json({ calls });
//   } catch (err) {
//     console.error("Error fetching calls:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

module.exports = router;
