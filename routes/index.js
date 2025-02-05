let express = require("express");
let router = express.Router();

let Mongoose = require("mongoose").Mongoose;
let Schema = require("mongoose").Schema;

let oldMong = new Mongoose();
oldMong.connect("mongodb://127.0.0.1:27017/db");

let meetingSchema = new Schema(
  {
    meetingId: String,
    title: String,
    image: String,
    price: Number,
    category: String,
    description: String,
    quantity: Number,
  },
  { collection: "meetings" }
);

let meetings = oldMong.model("meetings", meetingSchema);

// Admin server page
router.get("/", async function (req, res, next) {
  res.render("index");
});

// Crud
router.post("/createMeeting", async function (req, res, next) {
  let retVal = { response: "fail" };
  await meetings.create(req.body, function (err, res) {
    if (!err) {
      retVal = { response: "success" };
    }
  });
  res.json(retVal);
});

// cRud   Should use GET . . . we'll fix this is Cloud next term
router.post("/readMeeting", async function (req, res, next) {
  let data;
  if (req.body.cmd == "all") {
    data = await meetings.find().lean();
  } else {
    data = await meetings.find({ _id: req.body._id }).lean();
  }
  res.json({ meetings: data });
});

// crUd   Should use PUT . . . we'll fix this is Cloud next term
router.post("/updateMeeting", async function (req, res, next) {
  let retVal = { response: "fail" };
  await meetings.findOneAndUpdate(
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
router.post("/deleteMeeting", async function (req, res, next) {
  let retVal = { response: "fail" };
  await meetings.deleteOne({ _id: req.body._id }, function (err, res) {
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
  data = await meetings.find().lean();
  return { meetings: data };
}

router.post("/saveMeeting", async function (req, res, next) {
  const meetings = await saveMeeting(req.body);
  res.json(meetings);
});

async function saveMeeting(theMeeting) {
  console.log("theMeeting: " + theMeeting);
  await meetings.create(theMeeting, function (err, res) {
    if (err) {
      console.log("Could not insert new meeting");
      return { saveMeetingResponse: "fail" };
    }
  });
  return { saveMeetingResponse: "success" };
}

module.exports = router;
