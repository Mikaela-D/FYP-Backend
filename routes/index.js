// C:\Users\Mikaela\FYP-Backend\routes\index.js

let express = require("express");
let router = express.Router();

let Mongoose = require("mongoose").Mongoose;
let Schema = require("mongoose").Schema;

let oldMong = new Mongoose();
oldMong.connect("mongodb://127.0.0.1:27017/db");

let clientSchema = new Schema(
  {
    clientId: { type: String, unique: true },
    customerName: String,
    customerPhone: String,
    customerEmail: { type: String, unique: true },
  },
  { collection: "clients" }
);

let meetingSchema = new Schema(
  {
    meetingId: { type: String, unique: true },
    title: String,
    clientId: { type: String, ref: "clients" }, // Changed to store clientId reference
    category: String,
    priority: String,
    status: String,
    description: String,
    image: String,
  },
  { collection: "meetings" }
);

let Clients = oldMong.model("clients", clientSchema);
let Meetings = oldMong.model("meetings", meetingSchema);

// Admin server page
router.get("/", async function (req, res, next) {
  res.render("index");
});

// Crud
// Create Meeting with Client Reference
router.post("/createMeeting", async function (req, res, next) {
  let retVal = { response: "fail" };
  let { customerName, customerPhone, customerEmail, ...meetingData } = req.body;

  try {
    let client = await Clients.findOne({ customerEmail }).lean();

    if (!client) {
      client = await Clients.create({
        clientId: new Mongoose().Types.ObjectId().toString(),
        customerName,
        customerPhone,
        customerEmail,
      });
    }

    let meeting = await Meetings.create({ ...meetingData, clientId: client.clientId });

    if (meeting) {
      retVal = { response: "success" };
    }
  } catch (err) {
    console.error("Error creating meeting:", err);
  }

  res.json(retVal);
});

// cRud   Should use GET . . . we'll fix this is Cloud next term
// Retrieve Meetings with Client Details
router.post("/readMeeting", async function (req, res, next) {
  let data;
  if (req.body.cmd == "all") {
    data = await Meetings.find().populate("clientId").lean();
  } else {
    data = await Meetings.find({ _id: req.body._id }).populate("clientId").lean();
  }
  res.json({ meetings: data });
});

// crUd   Should use PUT . . . we'll fix this is Cloud next term
// Update Meeting
router.post("/updateMeeting", async function (req, res, next) {
  let retVal = { response: "fail" };
  await Meetings.findOneAndUpdate(
    { _id: req.body._id },
    req.body,
    function (err, res) {
      if (!err) {
        retVal = { response: "success" };
      }
    }
  );
  res.json(retVal);
});

// cruD   Should use DELETE . . . we'll fix this is Cloud next term
// Delete Meeting
router.post("/deleteMeeting", async function (req, res, next) {
  let retVal = { response: "fail" };
  await Meetings.deleteOne({ _id: req.body._id }, function (err, res) {
    if (!err) {
      retVal = { response: "success" };
    }
  });
  res.json(retVal);
});

router.post("/getMeetings", async function (req, res, next) {
  const meetings = await getMeetings();
  res.json(meetings);
});

async function getMeetings() {
  data = await Meetings.find().populate("clientId").lean();
  return { meetings: data };
}

router.post("/saveMeeting", async function (req, res, next) {
  const meetings = await saveMeeting(req.body);
  res.json(meetings);
});

async function saveMeeting(theMeeting) {
  console.log("theMeeting: " + theMeeting);
  await Meetings.create(theMeeting, function (err, res) {
    if (err) {
      console.log("Could not insert new meeting");
      return { saveMeetingResponse: "fail" };
    }
  });
  return { saveMeetingResponse: "success" };
}

module.exports = router;
